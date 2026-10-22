// Keep these defaults in sync with ThemeProvider in app/providers.tsx.
// next/script owns execution; next-themes' duplicate script is an inert data block.
export const THEME_BOOTSTRAP = `(() => {
  let theme = 'dark';
  try { theme = localStorage.getItem('theme') || 'dark'; } catch {}
  if (theme === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (theme !== 'light' && theme !== 'dark') theme = 'dark';
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;
})();`;
