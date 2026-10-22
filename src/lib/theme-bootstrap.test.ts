import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_BOOTSTRAP } from './theme-bootstrap';

afterEach(() => {
  localStorage.removeItem('theme');
  document.documentElement.className = '';
  document.documentElement.style.colorScheme = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('pre-hydration theme bootstrap', () => {
  it.each(['dark', 'light'])('preserves a saved %s preference', (theme) => {
    localStorage.setItem('theme', theme);
    new Function(THEME_BOOTSTRAP)();
    expect(document.documentElement.className).toBe(theme);
    expect(document.documentElement.style.colorScheme).toBe(theme);
  });

  it('resolves system preference before hydration', () => {
    localStorage.setItem('theme', 'system');
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    new Function(THEME_BOOTSTRAP)();
    expect(document.documentElement.className).toBe('light');
  });

  it('uses dark when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    new Function(THEME_BOOTSTRAP)();
    expect(document.documentElement.className).toBe('dark');
  });
});
