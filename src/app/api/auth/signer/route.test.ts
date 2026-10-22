// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  sessionData: vi.fn(),
  session: vi.fn(),
  lookup: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({
  getSessionData: mocks.sessionData,
  getSession: mocks.session,
}));
vi.mock('@/lib/farcaster/neynar', () => ({
  getSignerStatus: mocks.lookup,
  createSigner: mocks.create,
  registerSignedKey: vi.fn(),
}));
vi.mock('@/lib/env', () => ({ ENV: { APP_FID: '7', APP_SIGNER_PRIVATE_KEY: 'test-only' } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
import { POST as create } from './route';
import { POST as save } from './save/route';
import { GET as status } from './status/route';

const uuid = 'test-signer';
let live: { signerUuid: string | null; save: typeof mocks.save };
beforeEach(() => {
  vi.clearAllMocks();
  live = { signerUuid: uuid, save: mocks.save };
  mocks.sessionData.mockResolvedValue({ fid: 7, signerUuid: uuid });
  mocks.session.mockResolvedValue(live);
  mocks.lookup.mockResolvedValue({ signer_uuid: uuid, status: 'approved', fid: 7 });
});
const statusRequest = () =>
  new NextRequest('http://localhost/api/auth/signer/status?signer_uuid=' + uuid);
const saveRequest = () =>
  new NextRequest('http://localhost/api/auth/signer/save', {
    method: 'POST',
    body: JSON.stringify({ signerUuid: uuid, fid: 7 }),
  });

it.each([
  'revoked',
  'pending_approval',
  'generated',
])('does not save a %s signer', async (value) => {
  mocks.lookup.mockResolvedValue({ signer_uuid: uuid, status: value, fid: 7 });
  expect((await save(saveRequest())).status).toBe(403);
  expect(mocks.save).not.toHaveBeenCalled();
});
it.each([
  undefined,
  99,
])('cannot bind an approved signer with mismatched or missing FID %s', async (fid) => {
  mocks.lookup.mockResolvedValue({ signer_uuid: uuid, status: 'approved', fid });
  expect((await status(statusRequest())).status).toBe(403);
  expect((await save(saveRequest())).status).toBe(403);
  expect(mocks.save).not.toHaveBeenCalled();
});
it('binds only a matching approved signer and checks provider UUID identity', async () => {
  expect((await save(saveRequest())).status).toBe(200);
  expect(mocks.save).toHaveBeenCalledOnce();
  mocks.lookup.mockResolvedValue({ signer_uuid: 'different', status: 'approved', fid: 7 });
  expect((await status(statusRequest())).status).toBe(502);
});
it('does not claim that a cookie-held revoked signer is approved', async () => {
  mocks.lookup.mockResolvedValue({ signer_uuid: uuid, status: 'revoked', fid: 7 });
  expect((await create()).status).toBe(403);
  expect(live.signerUuid).toBeNull();
  expect(mocks.create).not.toHaveBeenCalled();
});
it('retains a saved signer during provider failure and refuses to attest approval', async () => {
  mocks.lookup.mockRejectedValue(new Error('offline'));
  expect((await create()).status).toBe(503);
  expect(live.signerUuid).toBe(uuid);
  expect(mocks.save).not.toHaveBeenCalled();
});
