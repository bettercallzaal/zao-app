// Run against the local wrapper, or pass a deployed ZAO app origin.
// No session, signer, or API key is needed for these public reads.
const origin = new URL(process.argv[2] || 'http://127.0.0.1:3100');
if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) {
  throw new Error('Provide an HTTP(S) app origin without credentials.');
}
let failed = false;
for (const query of ['hypersnap client', 'hypersnap api', 'hypersnap quorum', 'hypersnap node']) {
  const url = new URL('/api/public/v1/search', origin);
  url.search = new URLSearchParams({ q: query, limit: '12' }).toString();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    console.log(
      JSON.stringify({
        query,
        source: data.source,
        checkedAt: data.checkedAt,
        coverage: data.coverage,
        nextCursor: data.nextCursor,
        posts: data.posts.map((post) => ({
          hash: post.hash,
          fid: post.fid,
          username: post.username,
          timestamp: new Date(post.timestamp).toISOString(),
          text: post.text,
          url: `https://warpcast.com/${encodeURIComponent(post.username)}/${post.hash}`,
        })),
      }),
    );
  } catch (error) {
    failed = true;
    console.error(JSON.stringify({ query, error: error.message }));
  }
}
if (failed) process.exitCode = 1;
