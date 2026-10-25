// Estate status: PLACEHOLDER, PUBLIC-ONLY.
//
// A hand-written list of The ZAO's public web surfaces, each checked from the
// phone with a plain HTTPS request. It must never name the local status
// server, the vault, a loopback or private-network host, or anything that
// needs a credential. scripts/mobile-estate.test.ts in the web repo fails CI
// if it does.
export interface EstateSurface {
  name: string;
  url: string;
}

export const estateSurfaces: EstateSurface[] = [
  { name: 'ZAO OS', url: 'https://zaoos.com' },
  { name: 'The ZAO site', url: 'https://thezao.xyz' },
  { name: 'ZAO calendar', url: 'https://luma.com/zao' },
  { name: 'zao-app source', url: 'https://github.com/bettercallzaal/zao-app' },
];

export interface SurfaceCheck {
  status: number | null;
  ms: number;
}

export async function checkSurface(url: string): Promise<SurfaceCheck> {
  const started = Date.now();
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return { status: res.status, ms: Date.now() - started };
  } catch {
    return { status: null, ms: Date.now() - started };
  }
}
