// @vitest-environment node
import { expect, it } from 'vitest';
import { publicAppOrigin } from './app-origin';
it('uses the configured deployment origin for metadata and Mini App links', () => {
  expect(publicAppOrigin('https://new-zao.vercel.app/')).toBe('https://new-zao.vercel.app');
});
it.each([
  'javascript:alert(1)',
  'https://name:secret@zao.example',
  'https://zao.example/path',
])('refuses an invalid public origin: %s', (value) => {
  expect(() => publicAppOrigin(value)).toThrow();
});
