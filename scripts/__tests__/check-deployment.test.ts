// @vitest-environment node
import { expect, it } from 'vitest';
import { inspectDeployment } from '../check-deployment.mjs';

const valid = {
  NEXT_PUBLIC_SIWF_DOMAIN: 'zao.example',
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_NEYNAR_CLIENT_ID: 'test-client',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  NEYNAR_API_KEY: 'test-api-key',
  SESSION_SECRET: 'x'.repeat(32),
  APP_FID: '7',
  APP_SIGNER_PRIVATE_KEY: '0x' + 'a'.repeat(64),
  UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'test-token',
  NEXT_PUBLIC_APP_URL: 'https://zao.example',
};
it('reports readiness without returning secret values', () => {
  const result = inspectDeployment(valid);
  expect(result.ready).toBe(true);
  expect(JSON.stringify(result)).not.toContain(valid.NEYNAR_API_KEY);
  expect(JSON.stringify(result)).not.toContain(valid.APP_SIGNER_PRIVATE_KEY);
});
it('identifies missing deployment configuration and rejects loopback/weak secrets', () => {
  expect(inspectDeployment({}).missing).toContain('UPSTASH_REDIS_REST_TOKEN');
  const result = inspectDeployment({
    ...valid,
    SESSION_SECRET: 'weak',
    ZAO_WORKSPACE_NODE_URL: 'http://127.0.0.1:3381',
    APP_SIGNER_PRIVATE_KEY: 'bad',
  });
  expect(result.ready).toBe(false);
  expect(result.invalid).toEqual(
    expect.arrayContaining(['SESSION_SECRET', 'APP_SIGNER_PRIVATE_KEY', 'ZAO_WORKSPACE_NODE_URL']),
  );
});
