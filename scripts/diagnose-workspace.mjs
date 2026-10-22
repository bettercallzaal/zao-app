import { existsSync } from 'node:fs';
if (existsSync('.env.local') && typeof process.loadEnvFile === 'function') process.loadEnvFile('.env.local');
const channel = 'https://warpcast.com/~/channel/zao';
const sources = {node: process.env.ZAO_WORKSPACE_NODE_URL || 'http://127.0.0.1:3381', channelApi: process.env.ZAO_WORKSPACE_FEED_NODE_URL || 'https://haatz.quilibrium.com'};
async function read(base, path) {
  const response = await fetch(base.replace(/\/$/, '') + path, {signal: AbortSignal.timeout(7000), cache: 'no-store'});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  if (text.length > 4_000_000) throw new Error('Oversized diagnostic response');
  return JSON.parse(text);
}
async function probe(base) {
  const paths = {info: '/v1/info', raw: '/v1/castsByParent?' + new URLSearchParams({url: channel,pageSize: '12',reverse:'true'}), enriched: '/v2/farcaster/feed/parent_urls?' + new URLSearchParams({parent_urls:channel,limit:'12',with_recasts:'false'})};
  const result = {};
  for (const [key, path] of Object.entries(paths)) {
    try {
      const data = await read(base, path);
      if (key === 'info') result.info = {version:data.version, shards:(data.shardInfos || []).map((s)=>({id:s.shardId,height:s.maxHeight,delay:s.blockDelay}))};
      else {
        const casts = key === 'raw' ? data.messages || [] : data.casts || [];
        const rows = casts.map((c)=>({hash:c.hash,fid:c.author?.fid ?? c.data?.fid,time:key === 'raw' ? (c.data.timestamp+1609459200)*1000 : Date.parse(c.timestamp)})).sort((a,b)=>b.time-a.time);
        result[key] = {count:rows.length,newest:rows[0] ? new Date(rows[0].time).toISOString() : null,sample:rows.slice(0,3).map(({hash,fid})=>({hash,fid})),cursorLength:(key === 'raw' ? data.nextPageToken : data.next?.cursor)?.length || 0};
      }
    } catch (error) { result[key] = {error: /^HTTP \d+$/.test(error.message) ? error.message : error.name}; }
  }
  return result;
}
const report = {checkedAt:new Date().toISOString(),sources:{},exactCastReadBack:{}};
for (const [name, base] of Object.entries(sources)) report.sources[name] = await probe(base);
const candidate = report.sources.channelApi.enriched.sample?.[0];
if (candidate) {
  const hash = '0x'+candidate.hash.replace(/^0x/, '');
  for (const [name, base] of Object.entries(sources)) {
    try {
      const raw = await read(base, '/v1/castById?' + new URLSearchParams({fid:String(candidate.fid),hash}));
      report.exactCastReadBack[name] = {found:raw.hash?.toLowerCase() === hash.toLowerCase(),hash};
    } catch { report.exactCastReadBack[name] = {found:false,reason:'Lookup unavailable or absent; not proof of deletion'}; }
  }
}
console.log(JSON.stringify(report,null,2));
