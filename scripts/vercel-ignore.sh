#!/usr/bin/env bash
# Vercel ignoreCommand logic. Exit 0 = SKIP the build, non-zero = BUILD.
#
# Ported from ZAOOS scripts/vercel-ignore.sh (same author, MIT). It lives in a
# file because Vercel caps an inline ignoreCommand at 256 characters. Changes
# from the ZAOOS version: the build paths are this app's, and test-only
# changes inside src/ skip too (tests never change what ships).
#
# Why: Vercel build minutes are the cost. A commit that touches only docs,
# tests or CI config should not spend them. Every decision is logged so the
# build log says why it built or skipped.

BUILD_PATHS=(
  src public
  package.json package-lock.json .npmrc .nvmrc
  next.config.ts tsconfig.json postcss.config.mjs community.config.ts
  instrumentation.ts instrumentation-client.ts sentry.edge.config.ts sentry.server.config.ts
  vercel.json scripts/vercel-ignore.sh
)
# Inside the build paths, these never change the deployed app.
TEST_ONLY=(
  ':(exclude,glob)src/**/__tests__/**'
  ':(exclude,glob)src/**/*.test.ts'
  ':(exclude,glob)src/**/*.test.tsx'
  ':(exclude)src/test-utils'
)

# 1. Only ever build production. Preview and branch deploys skip entirely,
#    which saves build minutes; CI on GitHub already typechecks, tests and
#    builds every PR.
if [ "${VERCEL_ENV:-}" != "production" ]; then
  echo "[vercel-ignore] non-production (${VERCEL_ENV:-unset}) -> SKIP"
  exit 0
fi

# 2. Make the previous deploy's SHA reachable. The clone is shallow, so the
#    SHA is usually absent; fetch just that object before giving up on it.
PREV="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -n "$PREV" ] && ! git cat-file -e "$PREV" 2>/dev/null; then
  git fetch --depth=1 origin "$PREV" 2>/dev/null || true
fi

# 3. Diff base: the previous deploy's SHA when reachable, else this commit's
#    parent (deepen by one if the shallow clone lacks it). Only when NO base
#    exists do we fall through to the safe default of building.
BASE=""
if [ -n "$PREV" ] && git cat-file -e "$PREV" 2>/dev/null; then
  BASE="$PREV"
else
  git rev-parse --verify -q HEAD^ >/dev/null 2>&1 || git fetch --deepen=1 origin 2>/dev/null || true
  if git rev-parse --verify -q HEAD^ >/dev/null 2>&1; then
    BASE="HEAD^"
  fi
fi
if [ -z "$BASE" ]; then
  echo "[vercel-ignore] no diff base reachable (prev=${PREV:-unset}) -> BUILD (safe default)"
  exit 1
fi

# 4. Build only if a build-relevant, non-test file changed since the base.
#    git diff --quiet exits 0 (no change -> SKIP) or 1 (changed -> BUILD).
if git diff --quiet "$BASE" HEAD -- "${BUILD_PATHS[@]}" "${TEST_ONLY[@]}"; then
  echo "[vercel-ignore] no build-relevant change vs $BASE -> SKIP"
  exit 0
else
  echo "[vercel-ignore] build-relevant change vs $BASE -> BUILD"
  exit 1
fi
