import type { Metadata } from 'next';
import { ClientDirectory } from '@/components/directory/ClientDirectory';

export const metadata: Metadata = {
  title: 'ZAO Client — a client of clients',
  description:
    'Compare Farcaster applications, explore their pros and tradeoffs, and find your next client.',
  alternates: { canonical: '/' },
};

export default function LandingPage() {
  return <ClientDirectory />;
}
