import type { Metadata } from 'next';

const miniAppEmbed = JSON.stringify({
  version: '1',
  imageUrl: 'https://zaoos.com/og',
  button: {
    title: 'Open The ZAO app',
    action: {
      type: 'launch_miniapp',
      url: 'https://zaoos.com/miniapp',
      name: 'The ZAO app',
      splashImageUrl: 'https://zaoos.com/splash.png',
      splashBackgroundColor: '#0a1628',
    },
  },
});

export const metadata: Metadata = {
  title: 'The ZAO app',
  description: 'The ZAO Community on Farcaster — gated music community mini app',
  other: {
    'fc:miniapp': miniAppEmbed,
  },
};

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
