function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const ENV = {
  // Public (safe for client)
  NEXT_PUBLIC_SUPABASE_URL: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_NEYNAR_CLIENT_ID: requireEnv('NEXT_PUBLIC_NEYNAR_CLIENT_ID'),

  // Server-only secrets
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  NEYNAR_API_KEY: requireEnv('NEYNAR_API_KEY'),
  SESSION_SECRET: requireEnv('SESSION_SECRET'),
  APP_FID: requireEnv('APP_FID'),
  APP_SIGNER_PRIVATE_KEY: requireEnv('APP_SIGNER_PRIVATE_KEY'),

  // Optional
  NEYNAR_WEBHOOK_SECRET: optionalEnv('NEYNAR_WEBHOOK_SECRET'),
  NEXT_PUBLIC_SIWF_DOMAIN: optionalEnv('NEXT_PUBLIC_SIWF_DOMAIN'),
  NEXT_PUBLIC_OPTIMISM_RPC_URL: optionalEnv('NEXT_PUBLIC_OPTIMISM_RPC_URL'),

  // Content moderation (optional)
  PERSPECTIVE_API_KEY: optionalEnv('PERSPECTIVE_API_KEY'),

  // @thezao official account (governance-powered posting)
  ZAO_OFFICIAL_FID: optionalEnv('ZAO_OFFICIAL_FID'),
  ZAO_OFFICIAL_SIGNER_UUID: optionalEnv('ZAO_OFFICIAL_SIGNER_UUID'),
  ZAO_OFFICIAL_NEYNAR_API_KEY: optionalEnv('ZAO_OFFICIAL_NEYNAR_API_KEY'),

  // Farcaster read API proxy (e.g., Hypersnap free Neynar proxy)
  FARCASTER_READ_API_BASE: optionalEnv('FARCASTER_READ_API_BASE'),

  // 0x Swap API -- swap routing on Base
  ZX_API_KEY: optionalEnv('ZX_API_KEY'),

} as const;
