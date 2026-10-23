import type { Metadata } from 'next';
import { ClientDirectory } from '@/components/directory/ClientDirectory';

export const metadata: Metadata = {
  title: 'ZAO Client — a client of clients',
  description:
    'Explore Farcaster applications, compare pros and tradeoffs, and discover the history behind the ecosystem.',
  alternates: { canonical: '/workspace' },
};

export default function WorkspacePage() {
  return <ClientDirectory />;
}
