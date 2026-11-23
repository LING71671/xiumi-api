// fetch_assets_static.mjs — 不用浏览器，直接把前端 bundle 抓到 capture/assets/
//
// 为什么需要它：`scripts/fetch_assets.mjs` 走 Playwright（要 Chromium、要装可选依赖），
// 只想补一批接口时太重。这里纯 HTTP 顺着 HTML/JS 里的引用递归抓，够用且可离线复现。
//
// 用法：
//   node scripts/fetch_assets_static.mjs                       # 默认种子：xiumi.us 首页
//   node scripts/fetch_assets_static.mjs https://xiumi.us/auth  # 指定种子
//
// 产物：capture/assets/<sha1前10位>__<url 净化名>.js|.html + capture/assets_index.json
// 这三者都在 .gitignore 里（capture/ 不入库）。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'capture', 'assets');
fs.mkdirSync(OUT, { recursive: true });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const HOSTS = new Set(['xiumi.us', 'edt.xiumius.cn', 'xiumius.cn', 'www.xiumi.us']);
const MAX_FILES = 260;
const MAX_BYTES = 6 * 1024 * 1024;

const seen = new Set();
const queue = [];
const saved = [];

const abs = (href, base) => { try { return new URL(href, base).href; } catch { return null; } };

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, redirect: 'follow' });
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, type: res.headers.get('content-type') || '', buf, finalUrl: res.url };
}

function nameFor(url, ext) {
  const h = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
  const clean = url.replace(/^https?:\/\//, '').replace(/[^\w.\-]+/g, '_').slice(0, 120);
  return `${h}__${clean}${ext}`;
}

function push(u, isSeed = false) {
  if (!u) return;
  let parsed;
  try { parsed = new URL(u); } catch { return; }
  if (!HOSTS.has(parsed.hostname)) return;
  if (!isSeed && !/\.(js|html?)($|\?)/i.test(parsed.pathname)) return;
  if (seen.has(u) || queue.includes(u)) return;
  queue.push(u);
}

function collectFromHtml(html, pageUrl) {
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) push(abs(m[1], pageUrl));
  for (const m of html.matchAll(/<link[^>]+href=["']([^"']+\.js[^"']*)["']/gi)) push(abs(m[1], pageUrl));
  for (const m of html.matchAll(/["']([^"']*(?:ng-tpl|\.min\.js|index\.min\.js)[^"']*)["']/gi)) push(abs(m[1], pageUrl));
}

function collectFromJs(js, base) {
  for (const m of js.matchAll(/["'`]([^"'`\s]{4,200}\.js(?:\?[^"'`\s]*)?)["'`]/g)) push(abs(m[1], base));
}

const seeds = process.argv.slice(2);
for (const s of (seeds.length ? seeds : ['https://xiumi.us/'])) push(s, true);

while (queue.length && saved.length < MAX_FILES) {
  const url = queue.shift();
  if (seen.has(url)) continue;
  seen.add(url);
  let r;
  try { r = await get(url); } catch (e) { console.log('ERR', url, e.message); continue; }
  if (r.status !== 200 || !r.buf.length || r.buf.length > MAX_BYTES) { console.log('SKIP', r.status, r.buf.length, url); continue; }
  const isHtml = /html/.test(r.type) || /\.html?($|\?)/.test(url);
  const ext = isHtml ? '.html' : '.js';
  const file = path.join(OUT, nameFor(url, ext));
  fs.writeFileSync(file, r.buf);
  saved.push({ url, file: path.basename(file), bytes: r.buf.length, isHtml });
  console.log('OK', String(r.buf.length).padStart(8), url.slice(0, 110));
  if (isHtml) collectFromHtml(r.buf.toString('utf8'), r.finalUrl || url);
  else if (/javascript|ecmascript|text\/plain|octet-stream/.test(r.type) || /\.js($|\?)/.test(url)) collectFromJs(r.buf.toString('utf8'), url);
}

console.log(`\n保存 ${saved.length} 个文件 -> capture/assets/`);
fs.writeFileSync(path.join(ROOT, 'capture', 'assets_index.json'), JSON.stringify(saved, null, 2));
