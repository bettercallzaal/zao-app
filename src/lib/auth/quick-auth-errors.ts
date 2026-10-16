import { Errors } from '@farcaster/quick-auth';

/**
 * jose error codes that mean the TOKEN is bad (wrong signature, malformed,
 * expired, wrong audience, signed by a key that is not Farcaster's).
 * @farcaster/quick-auth 0.0.8 wraps only three JWT errors in InvalidTokenError
 * and rethrows the rest raw, so the codes are matched here. jose's `code`
 * strings are part of its public error API.
 */
const TOKEN_FAULT_CODES = new Set([
  'ERR_JWT_INVALID',
  'ERR_JWT_EXPIRED',
  'ERR_JWT_CLAIM_VALIDATION_FAILED',
  'ERR_JWS_INVALID',
  'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
  'ERR_JWKS_NO_MATCHING_KEY',
  'ERR_JOSE_ALG_NOT_ALLOWED',
]);

/**
 * True when verifyJwt failed because of the token itself (answer 401).
 * False for anything else, such as a JWKS timeout or a network failure while
 * fetching Farcaster's keys: that is our verifier failing, not the user's
 * token, and must not be reported as "Invalid token".
 */
export function isTokenFault(error: unknown): boolean {
  if (error instanceof Errors.InvalidTokenError) return true;
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && TOKEN_FAULT_CODES.has(code);
}
