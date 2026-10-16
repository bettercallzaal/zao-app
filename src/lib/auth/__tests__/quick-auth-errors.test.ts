import { Errors } from '@farcaster/quick-auth';
import { describe, expect, it } from 'vitest';
import { isTokenFault } from '../quick-auth-errors';

function joseError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

describe('isTokenFault', () => {
  it('treats quick-auth InvalidTokenError as a token fault', () => {
    expect(isTokenFault(new Errors.InvalidTokenError('expired'))).toBe(true);
  });

  it.each([
    'ERR_JWT_INVALID',
    'ERR_JWT_EXPIRED',
    'ERR_JWT_CLAIM_VALIDATION_FAILED',
    'ERR_JWS_INVALID',
    'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
    'ERR_JWKS_NO_MATCHING_KEY',
    'ERR_JOSE_ALG_NOT_ALLOWED',
  ])('treats raw jose %s as a token fault', (code) => {
    expect(isTokenFault(joseError(code))).toBe(true);
  });

  it.each([
    ['a JWKS timeout', joseError('ERR_JWKS_TIMEOUT')],
    ['an invalid JWKS response', joseError('ERR_JWKS_INVALID')],
    ['a network failure', new TypeError('fetch failed')],
    ['null', null],
    ['a string', 'boom'],
  ])('does NOT call %s a token fault', (_label, error) => {
    expect(isTokenFault(error)).toBe(false);
  });
});
