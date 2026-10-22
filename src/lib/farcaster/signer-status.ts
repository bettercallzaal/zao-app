import { z } from 'zod';

// Neynar lookup-signer schema: status and FID are provider authority, not the cookie.
export const signerStatusSchema = z
  .object({
    signer_uuid: z.string().min(1),
    status: z.enum(['generated', 'pending_approval', 'approved', 'revoked']),
    fid: z.number().int().positive().optional(),
    permissions: z.array(z.string()).optional(),
  })
  .passthrough();

export function parseSignerStatus(raw: unknown, expectedUuid: string) {
  const parsed = signerStatusSchema.safeParse(raw);
  return parsed.success && parsed.data.signer_uuid === expectedUuid ? parsed.data : null;
}
