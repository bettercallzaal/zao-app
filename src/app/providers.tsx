'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Lazy-load the Farcaster auth provider - not needed on initial page render
import dynamic from 'next/dynamic';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { MiniAppGate } from '@/components/miniapp/MiniAppGate';

const LazyAuthKit = dynamic(
  () =>
    import('@/components/providers/AuthKitWrapper').then((m) => ({ default: m.AuthKitWrapper })),
  { ssr: false },
);

interface ProvidersProps {
  children: React.ReactNode;
  nonce: string;
}

export function Providers({ children, nonce }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        nonce={nonce}
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange={false}
      >
        <LazyAuthKit>
          <MiniAppGate>{children}</MiniAppGate>
        </LazyAuthKit>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
