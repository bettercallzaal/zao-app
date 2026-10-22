// @vitest-environment node
import { expect, it } from 'vitest';
import { allowsBrowserMutation } from '../request-origin';
const request = (headers: Record<string, string>, path = '/api/neynar/cast') =>
  new Request('https://zao.example' + path, { method: 'POST', headers });
const blockedHeaders: Record<string, string>[] = [
  { origin: 'https://evil.example', cookie: 'zaoos_session=sealed' },
  { origin: 'https://zao.example.evil.example', cookie: 'zaoos_session=sealed' },
  { origin: 'null', cookie: 'zaoos_session=sealed' },
  { 'sec-fetch-site': 'cross-site' },
  { 'sec-fetch-site': 'same-site', cookie: 'zaoos_session=sealed' },
  { cookie: 'zaoos_session=sealed' },
];
it.each(blockedHeaders)('refuses cross-origin or unproven session writes: %j', (headers) =>
  expect(allowsBrowserMutation(request(headers))).toBe(false));
it('allows same-origin iframe app requests, but does not trust the embedding host', () => {
  expect(
    allowsBrowserMutation(
      request({ origin: 'https://zao.example', cookie: 'zaoos_session=sealed' }),
    ),
  ).toBe(true);
  expect(
    allowsBrowserMutation(
      request({ origin: 'https://farcaster.xyz', cookie: 'zaoos_session=sealed' }),
    ),
  ).toBe(false);
});
it('preserves server-side jobs and signed webhook verification', () => {
  expect(allowsBrowserMutation(request({ authorization: 'Bearer cron-token' }))).toBe(true);
  expect(
    allowsBrowserMutation(
      request({ origin: 'https://webhook-sender.example' }, '/api/miniapp/webhook'),
    ),
  ).toBe(true);
});
