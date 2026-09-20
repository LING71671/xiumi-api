// analyze_capture.mjs — 解析录制流量，产出「实时验证过的接口 + 请求/响应字段字典」
// 输出: data/live_endpoints.json  data/schemas.json
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, CAPTURE_DIR } from './cfg.mjs';

const OUT = path.join(ROOT, 'data');
fs.mkdirSync(OUT, { recursive: true });

// ---------- 读入全部录制 ----------
const entries = [];
for (const f of fs.readdirSync(CAPTURE_DIR)) {
  if (!f.endsWith('.jsonl')) continue;
  const tag = f.replace('.jsonl', '');
  for (const line of fs.readFileSync(path.join(CAPTURE_DIR, f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { entries.push({ ...JSON.parse(line), tag }); } catch { /* 跳过坏行 */ }
  }
}

const APP_HOST = /(^|\.)(xiumi\.us|xiumius\.cn)$/i;
const ASSET = /\.(js|css|png|jpe?g|gif|webp|svg|woff2?|ttf|ico|mp3|mp4|map|pdf)(\?|$)/i;

/** 把路径里的具体 ID 归一成占位符 */
function templatizePath(p) {
  return p.split('/').map((seg) => {
    if (!seg) return seg;
    if (/^\d+$/.test(seg)) return '{id}';
    if (/^[0-9a-f]{32}$/i.test(seg)) return '{hash}';
    if (/^[A-Za-z0-9]{5}$/.test(seg) && /\d/.test(seg)) return '{sid}';
    if (/^[0-9a-f]{8,}$/i.test(seg)) return '{hash}';
    return seg;
  }).join('/');
}

function parseFormOrJson(postData, ct) {
  if (!postData) return { kind: null, keys: [] };
  if (/json/i.test(ct || '')) {
    try { const j = JSON.parse(postData); return { kind: 'json', keys: j && typeof j === 'object' ? Object.keys(j) : [], raw: j }; } catch { return { kind: 'json-invalid', keys: [] }; }
  }
  try {
    const u = new URLSearchParams(postData);
    return { kind: 'form', keys: [...new Set([...u.keys()])] };
  } catch { return { kind: 'other', keys: [] }; }
}

/** 生成结构指纹（供字段字典聚合） */
function sketch(v, depth = 0) {
  if (depth > 6) return '…';
  if (v === null) return 'null';
  if (Array.isArray(v)) return [sketch(v[0], depth + 1)];
  if (typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).slice(0, 200)) o[k] = sketch(v[k], depth + 1);
    return o;
  }
  return typeof v;
}

/** 取叶子路径 → 类型/示例值，用于字段字典 */
function leafPaths(v, prefix, out, depth = 0) {
  if (depth > 6 || v === undefined) return;
  if (v === null) { out[prefix] = { type: 'null', sample: null }; return; }
  if (Array.isArray(v)) {
    out[prefix] = { type: 'array', len: v.length };
    if (v.length) leafPaths(v[0], prefix + '[]', out, depth + 1);
    return;
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    out[prefix] = { type: 'object', keys: keys.length };
    if (keys.length > 60) { out[prefix].note = '键过多，已省略子字段'; return; }
    for (const k of keys) leafPaths(v[k], prefix ? prefix + '.' + k : k, out, depth + 1);
    return;
  }
  const s = String(v);
  out[prefix] = { type: typeof v, sample: s.length > 60 ? s.slice(0, 57) + '...' : v };
}

// ---------- 聚合 ----------
const api = new Map();
for (const e of entries) {
  if (e.kind !== 'response') continue;
  let u;
  try { u = new URL(e.url); } catch { continue; }
  if (!APP_HOST.test(u.hostname)) continue;
  if (ASSET.test(u.pathname)) continue;
  if (!/\/api\/|\/auth\//.test(u.pathname)) continue;

  const tmpl = templatizePath(u.pathname);
  const key = `${e.method} ${tmpl}`;
  if (!api.has(key)) {
    api.set(key, {
      method: e.method, path: tmpl, sampleUrls: new Set(), statuses: new Set(),
      queryKeys: new Set(), bodyKeys: new Set(), bodyKinds: new Set(),
      minRespSize: Infinity, maxRespSize: 0, tags: new Set(), count: 0,
      schemas: [], exampleResponse: null, contentType: '',
    });
  }
  const r = api.get(key);
  r.count++;
  if (r.sampleUrls.size < 4) r.sampleUrls.add(e.url.slice(0, 300));
  r.statuses.add(e.status);
  r.tags.add(e.tag);
  for (const k of u.searchParams.keys()) r.queryKeys.add(k);
  const body = parseFormOrJson(e.requestPostData, e.requestHeaders?.['content-type']);
  for (const k of body.keys) r.bodyKeys.add(k);
  if (body.kind) r.bodyKinds.add(body.kind);
  r.contentType = r.contentType || (e.contentType || '');
  if (e.body) {
    r.minRespSize = Math.min(r.minRespSize, e.body.length);
    r.maxRespSize = Math.max(r.maxRespSize, e.body.length);
    try {
      const j = JSON.parse(e.body);
      r.schemas.push(sketch(j));
      if (!r.exampleResponse) r.exampleResponse = j;
    } catch { /* 非 JSON */ }
  }
}

const rows = [...api.values()].map((r) => ({
  method: r.method,
  path: r.path,
  statuses: [...r.statuses].sort(),
  contentType: r.contentType,
  queryKeys: [...r.queryKeys].sort(),
  bodyKeys: [...r.bodyKeys].sort(),
  bodyKinds: [...r.bodyKinds],
  calls: r.count,
  respSize: r.minRespSize === Infinity ? null : `${r.minRespSize}~${r.maxRespSize}`,
  seenIn: [...r.tags].sort(),
  sampleUrls: [...r.sampleUrls],
  exampleResponse: r.exampleResponse,
})).sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

fs.writeFileSync(path.join(OUT, 'live_endpoints.json'), JSON.stringify({
  source: 'Playwright 实时流量（登录 + 38 条路由遍历）', count: rows.length, endpoints: rows,
}, null, 2));

// ---------- 字段字典 ----------
const fields = new Map();
for (const r of rows) {
  if (!r.exampleResponse) continue;
  if (r.exampleResponse && typeof r.exampleResponse === 'object' && 'data' in r.exampleResponse) {
    const payload = r.exampleResponse.data;
    const fp = `RESP ${r.method} ${r.path} → data`;
    const out = {};
    leafPaths(payload, '', out);
    for (const [k, v] of Object.entries(out)) {
      const full = k ? `${fp}.${k}` : fp;
      if (!fields.has(full)) fields.set(full, { type: v.type, sample: v.sample, samples: [] });
      const rec = fields.get(full);
      if (rec.samples.length < 5 && v.sample !== undefined) rec.samples.push(v.sample);
    }
  }
  for (const k of r.queryKeys) {
    const full = `QUERY ${r.method} ${r.path} ? ${k}`;
    if (!fields.has(full)) fields.set(full, { type: 'query', sample: undefined, samples: [] });
  }
  for (const k of r.bodyKeys) {
    const full = `BODY  ${r.method} ${r.path} · ${k}`;
    if (!fields.has(full)) fields.set(full, { type: 'body', sample: undefined, samples: [] });
  }
}

const fieldRows = [...fields.entries()].map(([k, v]) => ({ field: k, type: v.type, samples: v.samples }))
  .sort((a, b) => a.field.localeCompare(b.field));
fs.writeFileSync(path.join(OUT, 'schemas.json'), JSON.stringify({
  source: '实时流量样本反推的字段字典', count: fieldRows.length, fields: fieldRows,
}, null, 2));

console.log('录制条目:', entries.length);
console.log('实时验证接口:', rows.length);
console.log('字段条目:', fieldRows.length);
const byTag = {};
for (const r of rows) for (const t of r.seenIn) byTag[t] = (byTag[t] || 0) + 1;
console.log('按录制阶段:', JSON.stringify(byTag));
