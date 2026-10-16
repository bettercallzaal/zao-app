import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join The ZAO app',
  description:
    "Join The ZAO app: The ZAO's feed and song player, built on Farcaster.",
  openGraph: {
    title: 'Join The ZAO app',
    description: 'Check your wallet eligibility and join the ZAO community.',
    url: 'https://zaoos.com/onboard',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join The ZAO app',
    description: 'Check your wallet eligibility and join the ZAO community.',
  },
};

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
