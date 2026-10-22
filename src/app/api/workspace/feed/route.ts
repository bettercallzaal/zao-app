import { type NextRequest, NextResponse } from 'next/server';
import { readWorkspaceFeed } from '@/lib/workspace/read-feed';
import { MAX_WORKSPACE_CURSOR_LENGTH } from '@/lib/workspace/model';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const hash = params.get('hash') || undefined;
  const fid = params.get('fid');
  const token = params.get('pageToken') || undefined;
  if (
    (hash &&
      (!/^0x[\da-f]{40}$/i.test(hash) ||
        !fid ||
        !/^\d+$/.test(fid) ||
        Number(fid) < 1 ||
        !Number.isSafeInteger(Number(fid)))) ||
    (!hash && fid) ||
    (token && token.length > MAX_WORKSPACE_CURSOR_LENGTH)
  ) {
    return NextResponse.json({ error: 'Invalid cast or page token.' }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await readWorkspaceFeed({ hash, fid: fid ? Number(fid) : undefined, token }),
      { headers: { 'Cache-Control': 'public, max-age=20' } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          'The community connection is unavailable. Your saved posts are still here. Try again in a moment.',
      },
      { status: 503 },
    );
  }
}
