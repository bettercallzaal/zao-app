import { createClient } from '@farcaster/quick-auth';
import { type NextRequest, NextResponse } from 'next/server';
import { isTokenFault } from '@/lib/auth/quick-auth-errors';
import { saveSession } from '@/lib/auth/session';
import { ENV } from '@/lib/env';
import { getUserByFid } from '@/lib/farcaster/neynar';
import { AllowlistLookupError, checkAllowlist } from '@/lib/gates/allowlist';
import { logger } from '@/lib/logger';

const quickAuthClient = createClient();

export async function GET(req: NextRequest) {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authorization.split(' ')[1];

  // 1. Is the token valid? Only a fault in the token itself is a 401.
  let fid: number;
  try {
    // QuickAuth JWTs are tied to the domain in the Farcaster manifest, not the
    // request host.
    const domain = ENV.NEXT_PUBLIC_SIWF_DOMAIN || 'zaoos.com';
    const payload = await quickAuthClient.verifyJwt({ token, domain });
    fid = Number(payload.sub);
  } catch (error: unknown) {
    if (isTokenFault(error)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    logger.error('[miniapp/auth] token verifier unavailable:', error);
    return NextResponse.json(
      { error: 'Could not verify your sign-in right now. Please try again.' },
      { status: 503 },
    );
  }
  if (!Number.isInteger(fid) || fid <= 0) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2. Profile and membership. A failure here is ours, never "Invalid token".
  try {
    const neynarUser = await getUserByFid(fid);

    const gate = await checkAllowlist(fid);
    let hasAccess = gate.allowed;

    // If not found by FID, check by wallet addresses
    if (!hasAccess && neynarUser?.verified_addresses?.eth_addresses) {
      for (const addr of neynarUser.verified_addresses.eth_addresses) {
        const walletCheck = await checkAllowlist(undefined, addr);
        if (walletCheck.allowed) {
          hasAccess = true;
          break;
        }
      }
    }

    if (hasAccess) {
      await saveSession({
        fid,
        username: neynarUser?.username || '',
        displayName: neynarUser?.display_name || '',
        pfpUrl: neynarUser?.pfp_url || '',
      });
    }

    return NextResponse.json({
      fid,
      hasAccess,
      username: neynarUser?.username || '',
      displayName: neynarUser?.display_name || '',
      pfpUrl: neynarUser?.pfp_url || '',
    });
  } catch (error: unknown) {
    if (error instanceof AllowlistLookupError) {
      logger.error('[miniapp/auth] membership lookup failed for FID', fid, error);
      return NextResponse.json(
        { error: 'Could not verify membership. Please try again.' },
        { status: 503 },
      );
    }
    logger.error('[miniapp/auth] sign-in failed after token check for FID', fid, error);
    return NextResponse.json(
      { error: 'Sign-in is temporarily unavailable. Please try again.' },
      { status: 502 },
    );
  }
}
