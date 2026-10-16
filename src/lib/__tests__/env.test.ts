// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// All required env vars that env.ts calls requireEnv() on at module load
const REQUIRED_VARS: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_NEYNAR_CLIENT_ID: 'test-neynar-client-id',
  SUPABASE_SERVICE_ROLE_KEY: 'test-supabase-service-role-key',
  NEYNAR_API_KEY: 'test-neynar-api-key',
  SESSION_SECRET: 'test-session-secret',
  APP_FID: '12345',
  APP_SIGNER_PRIVATE_KEY: 'test-app-signer-private-key',
};

function setRequired() {
  for (const [k, v] of Object.entries(REQUIRED_VARS)) process.env[k] = v;
}

function clearRequired() {
  for (const k of Object.keys(REQUIRED_VARS)) delete process.env[k];
}

describe('ENV module', () => {
  beforeEach(() => {
    vi.resetModules();
    setRequired();
  });

  afterEach(() => {
    clearRequired();
    delete process.env.NEYNAR_WEBHOOK_SECRET;
  });

  it('loads and exposes required var values', async () => {
    const { ENV } = await import('../env');
    expect(ENV.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
    expect(ENV.NEYNAR_API_KEY).toBe('test-neynar-api-key');
    expect(ENV.APP_FID).toBe('12345');
  });

  it('throws when a required var is missing', async () => {
    delete process.env.NEYNAR_API_KEY;
    await expect(import('../env')).rejects.toThrow(
      'Missing required environment variable: NEYNAR_API_KEY',
    );
  });

  it('returns undefined for unset optional vars', async () => {
    const { ENV } = await import('../env');
    expect(ENV.NEYNAR_WEBHOOK_SECRET).toBeUndefined();
    expect(ENV.NEXT_PUBLIC_SIWF_DOMAIN).toBeUndefined();
  });

  it('captures an optional var when set', async () => {
    process.env.NEYNAR_WEBHOOK_SECRET = 'test-webhook-secret';
    const { ENV } = await import('../env');
    expect(ENV.NEYNAR_WEBHOOK_SECRET).toBe('test-webhook-secret');
  });
});
