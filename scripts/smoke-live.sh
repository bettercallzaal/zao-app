#!/usr/bin/env bash
# Launch smoke check for a deployed copy of The ZAO app.
#
#   scripts/smoke-live.sh https://example.com
#
# Every check asserts on CONTENT, not only on the status code: a 200 that
# serves the wrong page, or an error page, is a failure. One line per check.
# Exit 0 = every check passed, 1 = at least one failed, 2 = could not run
# (no URL, curl or python3 missing, or the base URL unreachable).
#
# Read-only: GET requests only, no cookies, no session. Safe to run against
# production.

set -u

BASE="${1:-}"
BASE="${BASE%/}"
if [ -z "$BASE" ]; then
  echo "usage: scripts/smoke-live.sh <base-url>" >&2
  exit 2
fi
for tool in curl python3; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "CANNOT RUN: $tool is not installed" >&2
    exit 2
  fi
done

TMP="$(mktemp -d "${TMPDIR:-/tmp}/smoke-live.XXXXXX")"
# Release: the temp dir holds only files this script wrote; removed on exit.
trap 'rm -f "$TMP"/body-* "$TMP"/code-*; rmdir "$TMP" 2>/dev/null' EXIT

FAILED=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAILED=1; }

# fetch <name> <path> [follow]: body to $TMP/body-<name>, status to $TMP/code-<name>.
# Returns non-zero only when curl itself could not complete the request.
fetch() {
  local name="$1" path="$2" follow="${3:-}"
  local args=(-sS --max-time 20 -o "$TMP/body-$name" -w '%{http_code}' -A 'zao-smoke-live/1')
  [ "$follow" = "follow" ] && args+=(-L)
  local code
  if ! code="$(curl "${args[@]}" "$BASE$path" 2>"$TMP/code-$name.err")"; then
    return 1
  fi
  printf '%s' "$code" >"$TMP/code-$name"
}

code_of() { cat "$TMP/code-$1" 2>/dev/null; }
# A 429 from an API route with no session usually means the rate limiter has no
# Redis (it fails closed in production), so name that instead of a bare code.
hint() { [ "$(code_of "$1")" = "429" ] && echo " (429: rate limiter denied, check the Upstash Redis env)"; }
body_has() { grep -qF -- "$2" "$TMP/body-$1"; }

# Reachability first: if the base URL does not answer at all, nothing else means anything.
if ! fetch home / follow; then
  echo "CANNOT RUN: $BASE did not answer ($(tr -d '\n' <"$TMP/code-home.err"))" >&2
  exit 2
fi

APP_NAME='The ZAO app'

# 1. / renders the app shell.
if [ "$(code_of home)" = "200" ] && body_has home "$APP_NAME"; then
  pass "/ renders the app shell (200, contains \"$APP_NAME\")"
else
  fail "/ renders the app shell: status $(code_of home), \"$APP_NAME\" $(body_has home "$APP_NAME" && echo found || echo missing)"
fi

# 2. /chat renders the app shell (signed out it redirects to the landing page).
if fetch chat /chat follow && [ "$(code_of chat)" = "200" ] && body_has chat "$APP_NAME"; then
  pass "/chat renders the app shell (200 after redirects, contains \"$APP_NAME\")"
else
  fail "/chat renders the app shell: status $(code_of chat)"
fi

# 3. /feed is not served while the front-door flag is off: the not-found page,
#    not the visitor feed. Asserted on CONTENT: a streamed page that calls
#    notFound() can answer 200 to a browser (a soft 404) while showing the
#    not-found page, so the status alone proves nothing either way.
if fetch feed /feed && body_has feed "This page doesn" && ! body_has feed "You can read the ZAO channels"; then
  pass "/feed is the not-found page (front door off; status $(code_of feed))"
else
  fail "/feed should be the not-found page with the front door off: status $(code_of feed)"
fi

# 4. /api/auth/session answers JSON (signed out: 401 with authenticated false).
if fetch session /api/auth/session &&
  python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); sys.exit(0 if d.get("authenticated") is False else 1)' "$TMP/body-session" 2>/dev/null; then
  pass "/api/auth/session returns JSON (status $(code_of session), authenticated false)"
else
  fail "/api/auth/session should return JSON with authenticated false: status $(code_of session)$(hint session)"
fi

# 5. /api/chat/messages without a session is a 401 JSON error, before any data.
if fetch messages '/api/chat/messages?channel=zao' && [ "$(code_of messages)" = "401" ] &&
  python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); sys.exit(0 if d.get("error") else 1)' "$TMP/body-messages" 2>/dev/null; then
  pass "/api/chat/messages without a session is 401 JSON"
else
  fail "/api/chat/messages without a session should be 401 JSON: status $(code_of messages)$(hint messages)"
fi

# 6. /manifest.json parses and names the app.
if fetch manifest /manifest.json &&
  python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); sys.exit(0 if d.get("name")==sys.argv[2] else 1)' "$TMP/body-manifest" "$APP_NAME" 2>/dev/null; then
  pass "/manifest.json parses, name is \"$APP_NAME\""
else
  fail "/manifest.json should parse with name \"$APP_NAME\": status $(code_of manifest)"
fi

# 7. /.well-known/farcaster.json parses and the mini app is named.
if fetch farcaster /.well-known/farcaster.json &&
  python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); m=d.get("miniapp") or d.get("frame") or {}; sys.exit(0 if m.get("name")==sys.argv[2] else 1)' "$TMP/body-farcaster" "$APP_NAME" 2>/dev/null; then
  pass "/.well-known/farcaster.json parses, mini app name is \"$APP_NAME\""
else
  fail "/.well-known/farcaster.json should parse with mini app name \"$APP_NAME\": status $(code_of farcaster)"
fi

# 8. No page body carries an old name.
OLD_NAMES=0
for page in home chat feed; do
  for old in 'zcaster' 'ZAO OS'; do
    if grep -qiF -- "$old" "$TMP/body-$page" 2>/dev/null; then
      fail "page body ($page) contains the old name \"$old\""
      OLD_NAMES=1
    fi
  done
done
[ "$OLD_NAMES" = "0" ] && pass "no page body contains \"zcaster\" or \"ZAO OS\""

if [ "$FAILED" = "0" ]; then
  echo "OK    all checks passed for $BASE"
  exit 0
fi
echo "FAILED  at least one check failed for $BASE"
exit 1
