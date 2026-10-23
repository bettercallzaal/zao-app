export const metadata = { title: 'ZAO Public Read API' };

export default function DevelopersPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8 text-gray-100">
      <h1 className="text-3xl font-bold">Build with the ZAO node</h1>
      <p>Public read API · beta v0.1 · no API key or wallet required.</p>
      <p>
        Search public casts, retrieve a cast, or read the ZAO channel. These endpoints support
        browser CORS and return a small public profile with each post.
      </p>
      <ul className="list-disc space-y-3 pl-6">
        <li>
          <a className="underline" href="/api/public/v1/search?q=hypersnap%20client&limit=5">
            Try a Hypersnap client search
          </a>
        </li>
        <li>
          <a className="underline" href="/api/public/v1/channel">
            Read the ZAO channel
          </a>
        </li>
        <li>
          <a
            className="underline"
            href="/api/public/v1/cast?hash=0xa0d52a201777a9a7656c290c0f1711a07eca77d7"
          >
            Look up an example cast
          </a>
        </li>
        <li>
          <a className="underline" href="/openapi.json">
            Download the OpenAPI specification
          </a>
        </li>
      </ul>
      <h2 className="text-xl font-semibold">Use it in your app</h2>
      <pre className="overflow-x-auto rounded bg-slate-900 p-4 text-sm">{`const api = 'http://127.0.0.1:3100'; // use the deployed origin when available
const response = await fetch(api + '/api/public/v1/search?q=hypersnap&limit=5');
if (!response.ok) throw new Error('Read failed: ' + response.status);
const { posts, nextCursor, source, coverage } = await response.json();`}</pre>
      <h2 className="text-xl font-semibold">Limits and coverage</h2>
      <p>
        Production allows 30 requests per minute per IP across these endpoints. Requests time out
        after seven seconds. Search accepts plain text up to 160 characters and a limit of 1–20. A
        multi-shard batch can return up to 96 posts; keep every returned post before requesting
        nextCursor. Timestamps are Unix milliseconds.
      </p>
      <p>
        Search and exact lookup use the configured ZAO node. The channel may use a separate
        Hypersnap API; check source on every response. Search is indexed and ranked, and does not
        guarantee all matching casts or newest-first order. A missing channel result does not prove
        a cast is absent from the node.
      </p>
      <p>
        Only GET, HEAD, and OPTIONS are supported. Errors use an error code with HTTP 400, 404, 429,
        or 503. Honor Retry-After on 429. Successful reads can be cached for 20 seconds.
      </p>
      <p>
        This page uses the origin you opened. A localhost address is available only on your
        computer. Public access requires deploying the app with a reachable read node and production
        rate limiting configured.
      </p>
    </main>
  );
}
