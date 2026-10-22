/**
 * Unsigned Mini App context lookup, for display and compatibility only.
 * A supplied FID never creates a member/admin session or signer binding.
 * Authenticated entry uses /api/miniapp/auth with a server-verified QuickAuth JWT.
 */
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByFid } from '@/lib/farcaster/neynar';
import { checkAllowlist } from '@/lib/gates/allowlist';
import { logger } from '@/lib/logger';

const BodySchema = z.object({
  fid: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const { fid } = parsed.data;

    const neynarUser = await getUserByFid(fid);
    if (!neynarUser) {
      return NextResponse.json({ error: 'FID not found' }, { status: 404 });
    }

    const gate = await checkAllowlist(fid);
    let hasAccess = gate.allowed;

    if (!hasAccess && neynarUser.verified_addresses?.eth_addresses) {
      for (const addr of neynarUser.verified_addresses.eth_addresses) {
        const walletCheck = await checkAllowlist(undefined, addr);
        if (walletCheck.allowed) {
          hasAccess = true;
          break;
        }
      }
    }

    // SECURITY: FID is UNSIGNED (client-supplied). Do NOT persist a session
    // from this path — this would allow account impersonation. Return only
    // a read-only context flag for UI purposes. Sensitive operations must use
    // the JWT-verified /api/miniapp/auth path (QuickAuth). See GitHub issue.
    return NextResponse.json({
      allowlisted: hasAccess,
      fid,
      username: neynarUser.username || '',
      displayName: neynarUser.display_name || '',
      pfpUrl: neynarUser.pfp_url || '',
    });
  } catch (error: unknown) {
    logger.error('Miniapp context auth error:', error);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}
