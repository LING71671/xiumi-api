// extract_endpoints.mjs — 从 JS bundle 中静态提取全站接口（路径 / 方法 / 参数 / 调用点）
// v2: 函数作用域配对法定位 HTTP 方法 + 基址常量展开拼接路径
// 输出: data/endpoints.json  data/endpoints.csv  capture/api_paths_raw.txt
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, CAPTURE_DIR } from './cfg.mjs';

const SCAN_DIRS = [path.join(CAPTURE_DIR, 'assets'), path.join(CAPTURE_DIR, 'js')];
const OUT_DIR = path.join(ROOT, 'data');
fs.mkdirSync(OUT_DIR, { recursive: true });

const files = [];
for (const d of SCAN_DIRS) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) if (/\.(js|html)$/i.test(f)) files.push(path.join(d, f));
}

const decodeEscapes = (s) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
const BASE_PATH = /^\/(?:api|auth|wxauth|shows|studio|open|third|cgi|rpc|graphql)\b/;
const NOISE = /\/(?:images|styles|scripts|views|fonts|libs|common|app)\//;

// ---------- 1) 基址常量（记录声明位置，供词法作用域解析） ----------
function collectBaseConsts(src) {
  const map = new Map();
  for (const m of src.matchAll(/([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*["'`](\/(?:api|auth)\/[A-Za-z0-9_\-/.$]*?)["'`]/g)) {
    const [, name, base] = m;
    if (base.length < 6 || !BASE_PATH.test(base)) continue;
    if (!map.has(name)) map.set(name, []);
    map.get(name).push({ idx: m.index, base: base.replace(/\/$/, '') });
  }
  return map;
}

/** 站点 idx 的祖先作用域链（由内向外的作用域起始位置） */
function ancestorChain(idxData, idx) {
  const out = [];
  let p = innermostScope(idxData, idx)[0];
  let guard = 0;
  while (p >= 0 && guard++ < 500) { out.push(p); p = idxData.parentOf.get(p); }
  return out;
}

/** 读取 idx 处作用域若为函数体，返回其形参名集合 */
function scopeParamNames(src, braceIdx) {
  // braceIdx 指向 '{'，向前找 function(...) 或 (...) =>
  const head = src.slice(Math.max(0, braceIdx - 400), braceIdx);
  const m = head.match(/\(([^()]*)\)\s*$/) || head.match(/function\s*[A-Za-z0-9_$]*\s*\(([^()]*)\)\s*$/);
  const tail = head.match(/function\s*[A-Za-z0-9_$]*\s*\(([^()]*)\)\s*$/);
  const paramSrc = (tail && tail[1]) || (m && m[1]) || '';
  return new Set(paramSrc.split(',').map((x) => x.trim()).filter((x) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(x)));
}

/** 词法作用域解析基址变量：只在声明所在作用域（或其内层）生效，且需排除参数遮蔽 */
function resolveBase(name, siteIdx, decls, idxData, src) {
  const list = decls.get(name);
  if (!list || !list.length) return null;
  const chain = ancestorChain(idxData, siteIdx);

  // 参数遮蔽：任一祖先作用域把 name 作为形参 → 该 name 在站点处不是基址常量
  for (const s of chain) {
    if (scopeParamNames(src, s).has(name)) return null;
    if (s > 0 && src[s - 1] === '>' ) { /* 箭头函数已覆盖 */ }
  }

  const chainPos = new Map(chain.map((s, i) => [s, i]));
  let best = null;
  for (const d of list) {
    if (d.idx > siteIdx) continue;
    if (siteIdx - d.idx > 30000) continue;              // 邻近性护栏：同模块区域
    const declScope = innermostScope(idxData, d.idx)[0];
    if (!chainPos.has(declScope)) continue;
    const depth = chainPos.get(declScope);
    if (!best || depth < best.depth || (depth === best.depth && d.idx > best.idx)) {
      best = { base: d.base, depth, idx: d.idx };
    }
  }
  if (best) return best.base;
  if (list.length === 1 && siteIdx - list[0].idx <= 30000) return list[0].base;
  return null;
}

// ---------- 2) 路径归一化 ----------
function normalizePath(p) {
  let s = p
    .replace(/\$\{[^}]*\}/g, '{var}')
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, '');
  return s || '/';
}

function semanticVar(scopeText, raw, ctxBefore) {
  const cands = ['show_id', 'team_id', 'show_goods_id', 'order_id', 'invoice_id', 'tag_id',
    'partner_app_id', 'user_sid', 'u_sid', 'show_type', 'unique_uid'];
  for (const c of cands) if (ctxBefore.includes(c)) return `{${c}}`;
  return '{var}';
}

// ---------- 2.5) 拼接链解析 ----------
/**
 * 从 idx 处开始解析 `A + B + C` 形式的路径拼接链，
 * 字符串字面量原样保留，表达式操作数替换为 {var}。
 * 返回 { path, placeholders: [expr...], endIdx }
 */
function parseConcatChain(src, idx) {
  let out = '';
  const placeholders = [];
  let i = idx;
  let steps = 0;
  let seenLiteral = false;
  while (steps++ < 12) {
    while (i < src.length && /\s/.test(src[i])) i++;
    const c = src[i];
    if (c === undefined) break;
    if (c === '"' || c === "'" || c === '`') {
      const q = c; let j = i + 1; let buf = '';
      while (j < src.length) {
        if (src[j] === '\\') { buf += src[j + 1] ?? ''; j += 2; continue; }
        if (src[j] === q || src[j] === '\n') break;
        buf += src[j]; j++;
      }
      // 严格性：后续字符串片段必须以 / 开头，否则视为跑出路径链
      if (seenLiteral && !buf.startsWith('/')) break;
      if (buf.length > 100) break;
      out += buf; seenLiteral = true;
      i = j + 1;
    } else {
      let j = i, depth = 0;
      while (j < src.length) {
        const ch = src[j];
        if (ch === '(' || ch === '[') depth++;
        else if (ch === ')' || ch === ']') { if (depth === 0) break; depth--; }
        else if (depth === 0 && (ch === '+' || ch === ',' || ch === ';' || ch === '}' || ch === '\n')) break;
        j++;
      }
      const expr = src.slice(i, j).trim();
      if (!expr || expr.length > 120) break;
      placeholders.push(expr);
      out += '{var}';
      i = j;
    }
    let k = i;
    while (k < src.length && /\s/.test(src[k])) k++;
    if (src[k] === '+') { i = k + 1; continue; }
    break;
  }
  return { path: out, placeholders, endIdx: i };
}

/** 依「前一个路径段」推断路径参数名，比按上下文猜测更准 */
const SEG_PARAM = {
  teams: 'team_id', team: 'team_id',
  shows: 'show_id', show: 'show_id',
  orders: 'order_id', order: 'order_id',
  invoices: 'invoice_id', invoice: 'invoice_id',
  tags: 'tag_id', tag: 'tag_id',
  show_goods: 'show_goods_id', tpl_goods: 'show_goods_id', goodses: 'show_goods_id',
  partnerapp: 'partner_app_id', ownerpartnerapp: 'partner_app_id',
  messages: 'message_id', contacts: 'contact_id', exhibits: 'exhibit_id',
  forms: 'show_id', assets: 'asset_id',
  follow: 'u_sid', follows: 'u_sid', fans: 'u_sid', users: 'u_sid', user: 'u_sid',
};

function namePlaceholders(pathStr, placeholders) {
  if (!pathStr.includes('{var}')) return pathStr;
  const parts = pathStr.split('/');
  const used = new Map();
  let pi = 0;
  let lastSeg = '';
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '{var}') {
      const expr = placeholders[pi++] || '';
      let name = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(expr) && /(_id|_sid|_uid|show_type)$/.test(expr)
        ? expr : (SEG_PARAM[lastSeg] || 'param');
      const n = (used.get(name) || 0) + 1;
      used.set(name, n);
      parts[i] = n > 1 ? `{${name}${n}}` : `{${name}}`;
    } else {
      lastSeg = parts[i].split('?')[0];
    }
  }
  return parts.join('/');
}

// ---------- 3) 作用域索引（花括号配对） ----------
/** 一次前向扫描建立：字符串掩码 + 花括号配对 + 父子链 */
function buildIndex(src) {
  const n = src.length;
  const inStr = new Uint8Array(n);
  const opens = [];
  const matchOf = new Map(); // openIdx -> closeIdx
  const parentOf = new Map(); // openIdx -> parentOpenIdx
  const stack = [];
  let quote = null;
  for (let i = 0; i < n; i++) {
    const c = src[i];
    if (quote) {
      inStr[i] = 1;
      if (c === '\\') { if (i + 1 < n) inStr[i + 1] = 1; i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; inStr[i] = 1; continue; }
    if (c === '{') {
      opens.push(i);
      parentOf.set(i, stack.length ? stack[stack.length - 1] : -1);
      stack.push(i);
    } else if (c === '}') {
      const o = stack.pop();
      if (o !== undefined) matchOf.set(o, i);
    }
  }
  return { inStr, opens, matchOf, parentOf };
}

/** 包含 idx 的最内层花括号作用域 [start,end] */
function innermostScope(idxData, idx) {
  const { opens, matchOf, parentOf } = idxData;
  // opens 有序，二分找 <= idx 的最后一个
  let lo = 0, hi = opens.length - 1, p = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (opens[mid] <= idx) { p = opens[mid]; lo = mid + 1; } else hi = mid - 1;
  }
  let guard = 0;
  while (p >= 0 && guard++ < 200) {
    const e = matchOf.get(p);
    if (e !== undefined && e > idx) return [p, e];
    p = parentOf.get(p);
  }
  return [Math.max(0, idx - 800), Math.min(idx + 800, idx + 800)];
}

const METHOD_CALL = /\.(get|post|put|delete|patch)\s*\(/g;
const METHOD_OBJ = /method\s*:\s*["'](GET|POST|PUT|DELETE|PATCH)["']/gi;

function detectMethodInScope(scope, pathOffsetInScope) {
  const calls = [];
  for (const m of scope.matchAll(METHOD_CALL)) calls.push({ pos: m.index, method: m[1].toUpperCase(), kind: 'call' });
  for (const m of scope.matchAll(METHOD_OBJ)) calls.push({ pos: m.index, method: m[1].toUpperCase(), kind: 'obj' });

  // 1) 紧邻前置（同一表达式，间距 < 80）
  const pre = calls.filter((c) => c.pos < pathOffsetInScope && pathOffsetInScope - c.pos < 80).sort((a, b) => b.pos - a.pos);
  if (pre.length) return { method: pre[0].method, via: 'inline' };

  // 2) 之后最近（URI 变量式：new URI("/api/x"); ... o.delete(uri)）
  const post = calls.filter((c) => c.pos > pathOffsetInScope).sort((a, b) => a.pos - b.pos);
  if (post.length) return { method: post[0].method, via: 'scope-after' };

  // 3) 之前最近
  const before = calls.filter((c) => c.pos < pathOffsetInScope).sort((a, b) => b.pos - a.pos);
  if (before.length) return { method: before[0].method, via: 'scope-before' };
  return { method: '', via: '' };
}

// ---------- 4) 参数提取 ----------
const IGNORE_PARAMS = new Set(['method', 'url', 'withCredentials', 'headers', 'params', 'data',
  'timeout', 'responseType', 'transformRequest', 'isArray', 'cache', 'baseUrl', 'fetching', 'noMore',
  'then', 'catch', 'finally', 'length', 'prototype', 'constructor', 'hasOwnProperty']);

function extractParamKeys(text, startIdx) {
  let i = text.indexOf('{', startIdx);
  if (i < 0 || i - startIdx > 200) return [];
  let depth = 0, end = -1, inStr = null;
  for (let j = i; j < Math.min(text.length, i + 3000); j++) {
    const c = text[j];
    if (inStr) { if (c === '\\') { j++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end < 0) return [];
  const body = text.slice(i + 1, end);
  const keys = new Set();
  let d = 0; inStr = null;
  for (let j = 0; j < body.length; j++) {
    const c = body[j];
    if (inStr) { if (c === '\\') { j++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{' || c === '[' || c === '(') d++;
    else if (c === '}' || c === ']' || c === ')') d--;
    else if (d === 0) {
      const km = body.slice(j).match(/^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:/);
      if (km && (j === 0 || /[,{]\s*$/.test(body.slice(0, j)))) { keys.add(km[1]); j += km[0].length - 1; }
    }
  }
  return [...keys];
}

// ---------- 5) 主扫描 ----------
const records = new Map();

/** 路径合法性硬校验：拦掉从压缩代码里误粘出来的碎片 */
const VALID_PATH = /^\/(?:api|auth)\/[A-Za-z0-9_\-/.{}]*$/;

function splitQuery(raw) {
  const qi = raw.indexOf('?');
  if (qi < 0) return { pathPart: raw, query: [] };
  const q = raw.slice(qi + 1);
  const names = [];
  for (const kv of q.split('&')) {
    const n = kv.split('=')[0].trim();
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) names.push(n);
  }
  return { pathPart: raw.slice(0, qi), query: names };
}

function record(fullPath, rawPath, method, via, params, file, sample) {
  const { pathPart, query } = splitQuery(fullPath);
  const norm = normalizePath(pathPart);
  if (!VALID_PATH.test(norm)) return;
  if (norm.split('/').length < 3) return;
  if (!records.has(norm)) {
    records.set(norm, { path: norm, raw_paths: new Set(), methods: new Map(), files: new Set(), params: new Set(), query: new Set(), samples: [] });
  }
  const r = records.get(norm);
  r.raw_paths.add(rawPath);
  for (const q of query) r.query.add(q);
  if (method) {
    const cur = r.methods.get(method) || { count: 0, via };
    cur.count++; r.methods.set(method, cur);
  }
  r.files.add(file);
  for (const p of params) if (!IGNORE_PARAMS.has(p)) r.params.add(p);
  if (r.samples.length < 3 && sample) r.samples.push(sample.replace(/\s+/g, ' ').slice(0, 260));
}

for (const f of files) {
  let src;
  try { src = decodeEscapes(fs.readFileSync(f, 'utf8')); } catch { continue; }
  const fname = path.basename(f);
  const baseConsts = collectBaseConsts(src);
  const idxData = buildIndex(src);

  const sites = [];
  // a) 字符串字面量（若后面还有 + 拼接，则解析整条链）
  for (const m of src.matchAll(/["'`](\/(?:api|auth|wxauth|open|third)\/[A-Za-z0-9_\-/.${}]*)/g)) {
    const openQuote = m.index;
    const afterQuote = openQuote + m[0].length;
    let k = afterQuote; while (k < src.length && /\s/.test(src[k])) k++;
    let full = m[1]; let placeholders = [];
    if (src[k] === '+') {
      const chain = parseConcatChain(src, openQuote);
      if (chain.path && chain.path.length <= 160) { full = chain.path; placeholders = chain.placeholders; }
    }
    sites.push({ idx: openQuote, raw: full, literal: m[1], placeholders });
  }
  // b) 基址常量 + 拼接链（按词法作用域解析基址）
  for (const [name, decls] of baseConsts) {
    const esc = name.replace(/\$/g, '\\$');
    const re = new RegExp(`\\b${esc}\\s*\\+\\s*`, 'g');
    for (const m of src.matchAll(re)) {
      { // 首个操作数必须是 "..." 或 '...' 且内容以 / 开头，否则丢弃
        let q = m.index + m[0].length;
        while (q < src.length && /s/.test(src[q])) q++;
        const quote = src[q];
        if (quote !== String.fromCharCode(34) && quote !== String.fromCharCode(39) && quote !== String.fromCharCode(96)) continue;
        const lit = src.slice(q + 1, q + 2);
        if (lit !== "/") continue;
      }
      const base = resolveBase(name, m.index, baseConsts, idxData, src);
      if (!base) continue;
      const chain = parseConcatChain(src, m.index + m[0].length);
      if (!chain.path || chain.path.length > 160) continue;
      sites.push({ idx: m.index, raw: base + chain.path, literal: '', placeholders: chain.placeholders, viaBase: name });
    }
  }

  // 去重（同 idx+raw）
  const seen = new Set();
  for (const s of sites) {
    const k = s.idx + '|' + s.raw;
    if (seen.has(k)) continue;
    seen.add(k);

    const [sStart, sEnd] = innermostScope(idxData, s.idx);
    const scope = src.slice(sStart, sEnd);
    const { method, via } = detectMethodInScope(scope, s.idx - sStart);

    // 把 {var} 换成有意义的路径参数名
    const ctxWindow = src.slice(Math.max(0, s.idx - 300), s.idx + 300);
    const fullPath = namePlaceholders(s.raw, s.placeholders || []);

    const params = [
      ...extractParamKeys(src, s.idx + (s.literal ? s.literal.length : 0)),
      ...[...src.slice(s.idx, s.idx + 500).matchAll(/[?&]([A-Za-z_][A-Za-z0-9_]*)=/g)].map((q) => q[1]),
      ...[...src.slice(Math.max(0, s.idx - 200), s.idx).matchAll(/search\(\s*\{\s*([A-Za-z_][A-Za-z0-9_]*)/g)].map((q) => q[1]),
    ];

    record(fullPath, s.raw, method, via, params, fname, src.slice(Math.max(0, s.idx - 90), s.idx + 170));
  }
}

// ---------- 6) 拆出 wiki 型子方法（get/post/put/delete/query/add/remove 等）----------
const rows = [...records.values()].map((r) => {
  const methods = [...r.methods.entries()].sort((a, b) => b[1].count - a[1].count).map(([m, v]) => m);
  return {
    path: r.path,
    methods,
    methodEvidence: Object.fromEntries([...r.methods.entries()].map(([m, v]) => [m, v.via])),
    module: r.path.split('/').filter(Boolean)[1] || 'other',
    params: [...r.params].sort(),
    query: [...r.query].sort(),
    files: [...r.files],
    raw_paths: [...r.raw_paths],
    samples: r.samples,
  };
}).sort((a, b) => a.path.localeCompare(b.path));

fs.writeFileSync(path.join(OUT_DIR, 'endpoints.json'), JSON.stringify({
  generatedFrom: files.map((x) => path.basename(x)), count: rows.length, endpoints: rows,
}, null, 2));

const csv = ['path,methods,module,params,files'];
for (const r of rows) csv.push([r.path, r.methods.join('|'), r.module, r.params.join('|'), r.files.join(';')]
  .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
fs.writeFileSync(path.join(OUT_DIR, 'endpoints.csv'), '\uFEFF' + csv.join('\n'), 'utf8');

fs.writeFileSync(path.join(CAPTURE_DIR, 'api_paths_raw.txt'),
  rows.map((r) => `${(r.methods[0] || '?').padEnd(6)}\t${r.path}\t${r.params.join(',')}`).join('\n'));

const withMethod = rows.filter((r) => r.methods.length).length;
console.log(`扫描文件 ${files.length}  唯一接口 ${rows.length}  已判定方法 ${withMethod} (${(withMethod / rows.length * 100).toFixed(0)}%)`);
const byModule = {};
for (const r of rows) byModule[r.module] = (byModule[r.module] || 0) + 1;
console.log('模块分布:', JSON.stringify(byModule));
