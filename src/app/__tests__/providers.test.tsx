import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { Providers } from '../providers';

vi.mock('next/dynamic', () => ({
  default:
    () =>
    ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/miniapp/MiniAppGate', () => ({
  MiniAppGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('keeps theme scripts inert when providers mount again on the client', () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
  const errors = vi.spyOn(console, 'error');
  for (let mount = 0; mount < 2; mount++) {
    const view = render(
      <Providers nonce="test-nonce">
        <p>Workspace</p>
      </Providers>,
    );
    expect(screen.getByText('Workspace')).toBeTruthy();
    const script = view.container.querySelector('script');
    expect(script?.type).toBe('application/x-zao-theme');
    view.unmount();
  }
  expect(errors.mock.calls.flat().join(' ')).not.toContain('Encountered a script tag');
});
