import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import Script from 'next/script';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { MiniAppReady } from '@/components/miniapp/MiniAppReady';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { Providers } from './providers';
import { THEME_BOOTSTRAP } from '@/lib/theme-bootstrap';
import {publicAppOrigin} from '@/lib/app-origin';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const APP_ORIGIN = publicAppOrigin();
const miniAppEmbed = JSON.stringify({
  version: '1',
  imageUrl: `${APP_ORIGIN}/og`,
  button: {
    title: 'Open The ZAO app',
    action: {
      type: 'launch_miniapp',
      url: `${APP_ORIGIN}/miniapp`,
      name: 'The ZAO app',
      splashImageUrl: `${APP_ORIGIN}/splash.png`,
      splashBackgroundColor: '#0a1628',
    },
  },
});

const SITE_DESCRIPTION =
  "The ZAO app: The ZAO's feed and song player, built on Farcaster. The ZAO is a decentralized impact network that returns profit margin, data and IP rights to artists, starting with music.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_ORIGIN),
  title: { default: 'The ZAO app', template: '%s · The ZAO app' },
  description: SITE_DESCRIPTION,
  applicationName: 'The ZAO app',
  authors: [{ name: 'The ZAO', url: 'https://thezao.xyz' }],
  creator: 'The ZAO',
  publisher: 'The ZAO',
  category: 'social',
  keywords: [
    'The ZAO',
    'The ZAO app',
    'Farcaster',
    'Farcaster mini app',
    'music',
    'artists',
    'decentralized impact network',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'The ZAO app',
    description: SITE_DESCRIPTION,
    url: APP_ORIGIN,
    siteName: 'The ZAO app',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The ZAO app',
    description: SITE_DESCRIPTION,
  },
  other: {
    'fc:miniapp': miniAppEmbed,
    'fc:frame': miniAppEmbed,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a1628',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? '';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="zao-theme-bootstrap" strategy="beforeInteractive" nonce={nonce}>
          {THEME_BOOTSTRAP}
        </Script>
        <meta property="csp-nonce" content={nonce} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://auth.farcaster.xyz" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <MiniAppReady />
        <Providers nonce={nonce}>{children}</Providers>
        <ServiceWorkerRegistration />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
