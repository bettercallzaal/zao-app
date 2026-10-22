import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function inspectDeployment(env) {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_NEYNAR_CLIENT_ID', 'SUPABASE_SERVICE_ROLE_KEY', 'NEYNAR_API_KEY', 'SESSION_SECRET', 'APP_FID', 'APP_SIGNER_PRIVATE_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SIWF_DOMAIN'];
  const missing = required.filter((name) => !env[name]?.trim());
  const invalid = [];
  if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) invalid.push('SESSION_SECRET');
  if (env.APP_FID && (!/^\d+$/.test(env.APP_FID) || Number(env.APP_FID) < 1 || !Number.isSafeInteger(Number(env.APP_FID)))) invalid.push('APP_FID');
  if (env.APP_SIGNER_PRIVATE_KEY && !/^0x[\da-f]{64}$/i.test(env.APP_SIGNER_PRIVATE_KEY)) invalid.push('APP_SIGNER_PRIVATE_KEY');
  for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'UPSTASH_REDIS_REST_URL', 'NEXT_PUBLIC_APP_URL', 'ZAO_WORKSPACE_NODE_URL', 'ZAO_WORKSPACE_FEED_NODE_URL']) {
    if (!env[name]) continue;
    try {
      const url = new URL(env[name]);
      // These are deployment checks: a Vercel function cannot reach this PC's loopback.
      if (url.protocol !== 'https:' || url.username || url.password || ['localhost','127.0.0.1','[::1]'].includes(url.hostname)) invalid.push(name);
      if (name === 'NEXT_PUBLIC_APP_URL' && (url.pathname !== '/' || url.search || url.hash)) invalid.push(name);
    } catch { invalid.push(name); }
  }
  if (env.NEXT_PUBLIC_APP_URL && env.NEXT_PUBLIC_SIWF_DOMAIN) {
    try { if (new URL(env.NEXT_PUBLIC_APP_URL).host !== env.NEXT_PUBLIC_SIWF_DOMAIN) invalid.push('NEXT_PUBLIC_SIWF_DOMAIN'); }
    catch { /* The URL error is reported above. */ }
  }
  return {ready: !missing.length && !invalid.length, missing, invalid: [...new Set(invalid)],
    notes: ['Presence/format checks only; credentials, database policies, rate limits and domain auth still require live verification.', 'Workspace public reads can run locally without the legacy app secrets.', 'Production signer revalidation is always enabled.']};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (existsSync('.env.local') && typeof process.loadEnvFile === 'function') process.loadEnvFile('.env.local');
  const result = inspectDeployment(process.env);
  // Never print values, key prefixes, hashes, or environment inventories.
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ready ? 0 : 1;
}
