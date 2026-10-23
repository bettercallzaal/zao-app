import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { quickFetch, context, router, ready } = vi.hoisted(() => ({
  quickFetch: vi.fn(),
  context: vi.fn(),
  router: { replace: vi.fn() },
  ready: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@farcaster/miniapp-sdk', () => ({
  sdk: {
    isInMiniApp: async () => true,
    actions: { ready },
    get context() {
      return context();
    },
    quickAuth: { fetch: quickFetch },
  },
}));
import { MiniAppGate } from './MiniAppGate';
beforeEach(() => {
  vi.clearAllMocks();
  ready.mockResolvedValue(undefined);
  context.mockResolvedValue({ user: { fid: 999 } });
  quickFetch.mockResolvedValue({ ok: true, json: async () => ({ hasAccess: true }) });
});
afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});
it('authenticates through verified QuickAuth without trusting the context FID', async () => {
  window.history.replaceState({}, '', '/chat');
  render(
    <MiniAppGate>
      <p>Member content</p>
    </MiniAppGate>,
  );
  await waitFor(() => expect(quickFetch).toHaveBeenCalledWith('/api/miniapp/auth'));
  expect(context).not.toHaveBeenCalled();
  await screen.findByText('Member content');
});
it.each([
  '/',
  '/workspace',
  '/workspace/review',
  '/developers',
])('keeps public route %s independent of credentialed authentication', async (path) => {
  window.history.replaceState({}, '', path);
  render(
    <MiniAppGate>
      <p>Public workspace</p>
    </MiniAppGate>,
  );
  await waitFor(() => expect(ready).toHaveBeenCalled());
  await screen.findByText('Public workspace');
  expect(quickFetch).not.toHaveBeenCalled();
});
