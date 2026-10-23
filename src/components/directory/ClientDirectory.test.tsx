import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ClientDirectory } from './ClientDirectory';

afterEach(cleanup);

it('finds the requested clients and distinguishes archived projects from previews', () => {
  render(<ClientDirectory />);
  const search = screen.getByRole('searchbox', { name: 'Search apps' });
  fireEvent.change(search, { target: { value: 'Felirami' } });
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Castline by Felirami' })).toBeTruthy();
  fireEvent.change(search, { target: { value: 'Jackcaster' } });
  const card = screen.getByRole('article');
  expect(within(card).getByRole('link', { name: 'View project ↗' }).getAttribute('href')).toBe(
    'https://github.com/wlplease/jackcast',
  );
  fireEvent.change(search, { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'History' }));
  expect(screen.getByRole('heading', { name: 'Opencast', exact: true })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'OPENCASTER', exact: true })).toBeNull();
  expect(screen.getByText('The owner archived the repository on August 28, 2025.')).toBeTruthy();
});

it('limits the comparison to three and only drafts feedback in the external composer', () => {
  render(<ClientDirectory />);
  const boxes = screen.getAllByRole('checkbox');
  for (const box of boxes.slice(0, 3)) fireEvent.click(box);
  expect((boxes[3] as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByRole('table')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Clear comparison' }));
  expect(screen.queryByRole('table')).toBeNull();
  expect((boxes[3] as HTMLInputElement).disabled).toBe(false);
  const feedback = screen.getAllByRole('link', { name: /Share your experience/ })[0];
  const target = new URL(feedback.getAttribute('href')!);
  expect(target.origin).toBe('https://farcaster.xyz');
  expect(target.pathname).toBe('/~/compose');
  expect(target.searchParams.get('text')).toContain('!zao-feedback directory');
  expect(feedback.getAttribute('rel')).toContain('noopener');
});
