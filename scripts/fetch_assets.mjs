// fetch_assets.mjs — 递归抓取站点 JS/HTML 资产，供后续静态提取接口
// 用法: node scripts/fetch_assets.mjs
import { request } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CAPTURE_DIR, PROXY, UA } from './cfg.mjs';

const OUT = path.join(CAPTURE_DIR, 'assets');
fs.mkdirSync(OUT, { recursive: true });

const SEEDS = [
  'https://xiumius.cn/',
  'https://xiumi.us/',
  'https://edt.xiumius.cn/',
  'https://xiumi.us/auth',
  // 编辑器（studio/v5）独立应用
  'https://edt.xiumius.cn/scripts/app/studio/entries/total/021cc3.main.min.js',
  'https://edt.xiumius.cn/views/app/studio/fb82a6.ng-tpl.min.js',
  'https://xiumi.us/template/v5/paper/comp/ng-tpl.js',
  'https://xiumi.us/template/v5/booklet/comp/ng-tpl.js',
];

const ALLOW_HOSTS = /(^|\.)(xiumius\.cn|xiumi\.us)$/i;

const ctx = await request.newContext({
  proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true,
  extraHTTPHeaders: { 'User-Agent': UA, Accept: '*/*' },
});

const seen = new Set();
const queue = [...SEEDS];
const manifest = [];
let bytes = 0;

function abs(u, base) {
  try { return new URL(u, base).toString(); } catch { return null; }
}

function wanted(u) {
  try {
    const url = new URL(u);
    if (!ALLOW_HOSTS.test(url.hostname)) return false;
    if (/^data:|^blob:/.test(u)) return false;
    return /\.(js|mjs|json|html?|css)(\?|$)/i.test(url.pathname) || url.pathname === '/';
  } catch { return false; }
}

async function grab(u, from) {
  if (seen.has(u)) return;
  seen.add(u);
  let res;
  try {
    res = await ctx.get(u, { timeout: 45000, maxRedirects: 5 });
  } catch (e) {
    manifest.push({ url: u, from, error: String(e.message).slice(0, 160) });
    return;
  }
  const ct = res.headers()['content-type'] || '';
  const buf = Buffer.from(await res.body());
  bytes += buf.length;
  const h = crypto.createHash('sha1').update(u).digest('hex').slice(0, 10);
  let name = u.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120);
  const ext = /javascript/.test(ct) ? '.js' : /json/.test(ct) ? '.json' : /html/.test(ct) ? '.html' : /css/.test(ct) ? '.css' : path.extname(new URL(u).pathname) || '.bin';
  if (!name.endsWith(ext)) name += ext;
  const fp = path.join(OUT, h + '__' + name);
  fs.writeFileSync(fp, buf);
  manifest.push({ url: u, from, status: res.status(), contentType: ct, size: buf.length, file: path.basename(fp) });

  const text = buf.toString('utf8');
  const refs = new Set();
  if (/javascript|html|json/.test(ct)) {
    for (const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) refs.add(m[1]);
    // webpack chunk 映射: "1234":"abcdef" -> 常见形式 __webpack_require__.u
    for (const m of text.matchAll(/["'`]((?:https?:)?\/\/[^"'`\s]+\.(?:js|css|json))["'`]/g)) refs.add(m[1]);
    for (const m of text.matchAll(/["'`](\/(?:scripts|views|styles|dist|static|assets)\/[^"'`\s]+\.(?:js|css|json))["'`]/g)) refs.add(m[1]);
    for (const m of text.matchAll(/["'`]([0-9a-f]{6,12}\.(?:index\.)?min\.js)["'`]/g)) refs.add(m[1]);
  }
  for (const r of refs) {
    const a = abs(r, u);
    if (a && wanted(a)) queue.push(a);
  }
}

let guard = 0;
while (queue.length && guard++ < 4000) {
  const u = queue.shift();
  await grab(u, 'queue');
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
const ok = manifest.filter((m) => !m.error);
console.log(`抓取完成: ${ok.length} 个资产, ${(bytes / 1048576).toFixed(2)} MB, 失败 ${manifest.length - ok.length}`);
console.log('输出目录:', OUT);
await ctx.dispose();
