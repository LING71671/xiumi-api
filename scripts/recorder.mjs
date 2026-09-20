// recorder.mjs — Playwright 流量录制器
// 记录每个请求/响应的 method、url、headers、postData、status、响应体。
// 产出：
//   capture/<tag>.jsonl          全量条目（逐行 JSON）
//   capture/js/<hash>.js         所有 JS 资源原文（用于静态提取接口）
//   capture/samples/<name>.json  结构化的 API 响应样本

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TEXTY = /json|javascript|ecmascript|text\/|xml|x-www-form-urlencoded|graphql/i;
const MAX_BODY = 2 * 1024 * 1024;      // 单条响应体上限
const MAX_JS = 8 * 1024 * 1024;        // 单个 JS 上限

export function slugify(u) {
  try {
    const url = new URL(u);
    let s = (url.host + url.pathname).replace(/[^A-Za-z0-9._-]+/g, '_');
    const q = url.search.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 60);
    if (q) s += q;
    return s.slice(0, 140);
  } catch {
    return 'unknown';
  }
}

export class Recorder {
  constructor(outDir, tag) {
    this.outDir = outDir;
    this.tag = tag;
    this.entries = [];
    this.jsSeen = new Set();
    this.jsDir = path.join(outDir, 'js');
    this.sampleDir = path.join(outDir, 'samples');
    fs.mkdirSync(this.jsDir, { recursive: true });
    fs.mkdirSync(this.sampleDir, { recursive: true });
    this.pending = new Set();
    this.seq = 0;
    this.notes = [];
  }

  note(msg) { this.notes.push({ ts: new Date().toISOString(), msg }); }

  /** 绑定到 page 或 context（context 级可覆盖新开的页面） */
  attach(page) {
    const onReq = (req) => {
      const e = {
        id: ++this.seq,
        ts: Date.now(),
        kind: 'request',
        method: req.method(),
        url: req.url(),
        resourceType: req.resourceType(),
        headers: safeHeaders(req.headers()),
        postData: safeText(req.postData()),
        isNavigation: req.isNavigationRequest(),
        frame: req.frame()?.url() || null,
      };
      this.entries.push(e);
    };

    const onRes = (res) => {
      const p = this._capture(res).catch(() => {});
      this.pending.add(p);
      p.finally(() => this.pending.delete(p));
    };

    const onFail = (req) => {
      this.entries.push({
        id: ++this.seq, ts: Date.now(), kind: 'failed',
        method: req.method(), url: req.url(), error: req.failure()?.errorText || 'unknown',
      });
    };

    page.on('request', onReq);
    page.on('response', onRes);
    page.on('requestfailed', onFail);
    page.on('console', (m) => {
      const t = m.text();
      if (t) this.entries.push({ id: ++this.seq, ts: Date.now(), kind: 'console', type: m.type(), text: t.slice(0, 2000) });
    });
    page.on('pageerror', (e) => {
      this.entries.push({ id: ++this.seq, ts: Date.now(), kind: 'pageerror', text: String(e).slice(0, 2000) });
    });
  }

  async _capture(res) {
    const req = res.request();
    const url = res.url();
    let ct = '';
    try { ct = (await res.allHeaders())['content-type'] || ''; } catch { /* noop */ }
    const rec = {
      id: ++this.seq,
      ts: Date.now(),
      kind: 'response',
      method: req.method(),
      url,
      status: res.status(),
      statusText: res.statusText(),
      contentType: ct,
      requestPostData: safeText(req.postData()),
      requestHeaders: safeHeaders(req.headers()),
    };
    try { rec.headers = safeHeaders(await res.allHeaders()); } catch { /* noop */ }

    if (TEXTY.test(ct) || /\.(js|mjs|json)(\?|$)/i.test(url)) {
      try {
        const body = await res.body();
        rec.bodySize = body.length;
        if (body.length <= MAX_BODY) rec.body = body.toString('utf8');
        else rec.bodyTruncated = true;

        // JS 资源落盘，供静态分析
        if (req.resourceType() === 'script' || /\.m?js(\?|$)/i.test(url)) {
          if (body.length <= MAX_JS) {
            const h = crypto.createHash('sha1').update(url).digest('hex').slice(0, 12);
            const fn = `${h}__${slugify(url)}`.slice(0, 160) + '.js';
            const fp = path.join(this.jsDir, fn);
            if (!this.jsSeen.has(url)) {
              this.jsSeen.add(url);
              fs.writeFileSync(fp, body);
              rec.jsSaved = fn;
            }
          }
        }

        // JSON 响应另存样本
        if (/json/i.test(ct) && body.length <= MAX_BODY) {
          try {
            const j = JSON.parse(body.toString('utf8'));
            const fn = slugify(url) + '.json';
            fs.writeFileSync(path.join(this.sampleDir, fn), JSON.stringify(j, null, 2));
            rec.sample = fn;
          } catch { /* 非合法 JSON 跳过 */ }
        }
      } catch (e) {
        rec.bodyError = String(e && e.message || e).slice(0, 200);
      }
    }
    this.entries.push(rec);
  }

  async flush() {
    if (this.pending.size) await Promise.allSettled([...this.pending]);
    const lines = this.entries.map((e) => JSON.stringify(e)).join('\n');
    fs.writeFileSync(path.join(this.outDir, `${this.tag}.jsonl`), lines);
    fs.writeFileSync(path.join(this.outDir, `${this.tag}.notes.json`), JSON.stringify(this.notes, null, 2));
    return { entries: this.entries.length, js: this.jsSeen.size };
  }

  summary() {
    const api = this.entries.filter((e) => e.kind === 'response' && isApiUrl(e.url));
    const byKey = new Map();
    for (const e of api) {
      const k = e.method + ' ' + pathKey(e.url);
      if (!byKey.has(k)) byKey.set(k, { key: k, count: 0, statuses: new Set(), sample: e.url });
      const v = byKey.get(k);
      v.count++;
      v.statuses.add(e.status);
    }
    return [...byKey.values()].map((v) => ({ ...v, statuses: [...v.statuses] })).sort((a, b) => a.key.localeCompare(b.key));
  }
}

export function isApiUrl(u) {
  try {
    const { pathname, host } = new URL(u);
    if (/\.(js|css|png|jpe?g|gif|webp|svg|woff2?|ttf|ico|mp3|mp4|map)(\?|$)/i.test(pathname)) return false;
    if (/api|ajax|rpc|graphql|\/v\d|\.json|\/user\/|\/cgi|\.php/i.test(pathname + host)) return true;
    return false;
  } catch { return false; }
}

export function pathKey(u) {
  try { const x = new URL(u); return x.origin + x.pathname; } catch { return u; }
}

function safeHeaders(h) {
  if (!h) return {};
  const out = {};
  for (const [k, v] of Object.entries(h)) {
    if (/^(?:authorization|token|x-token|x-auth|api[-_]?key|secret)$/i.test(k)) { out[k] = mask(v); continue; }
    out[k] = String(v).slice(0, 800);
  }
  return out;
}

function mask(v) {
  const s = String(v);
  if (s.length <= 12) return s;
  return s.slice(0, 6) + '...' + s.slice(-4) + ` (len=${s.length})`;
}

function safeText(t) {
  if (!t) return null;
  return t.length > 20000 ? t.slice(0, 20000) + '...[truncated]' : t;
}
