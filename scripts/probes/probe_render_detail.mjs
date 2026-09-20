/**
 * probe_render_detail.mjs — 在编辑器页里确认「图片真的被渲染成 <img>」
 */
import path from 'node:path';
import { chromium } from 'playwright-core';
import { CHROMIUM_PATH, launchOptions } from '../cfg.mjs';
import { Xiumi } from '../client/xiumi.mjs';

const SHOW_ID = Number(process.argv[2] || 727022072);
const IMG_HASH = process.argv[3] || '-sz_70.png';

const api = await Xiumi.loadSession(SESSION_FILE);
await api._me();
const meta = await api.getShow(SHOW_ID);

const browser = await chromium.launch({ ...launchOptions, executablePath: CHROMIUM_PATH });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
await ctx.addCookies([{ name: 'sid', value: api.sid, domain: '.xiumi.us', path: '/', httpOnly: true, secure: true, sameSite: 'None' }]);
const page = await ctx.newPage();

const reqs = [];
page.on('response', (r) => { if (/img\.xiumi\.us|xmi\/ua/.test(r.url())) reqs.push({ url: r.url(), status: r.status(), ct: r.headers()['content-type'] }); });

await page.goto(`https://xiumi.us${meta.edit_url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(9000);

for (const f of page.frames()) {
  const info = await f.evaluate((hash) => {
    const imgs = [...document.querySelectorAll('img')].map((i) => ({ src: i.src, w: i.naturalWidth, h: i.naturalHeight }));
    const html = document.body?.innerHTML || '';
    return {
      imgCount: imgs.length,
      imgs: imgs.slice(0, 10),
      htmlHasHash: html.includes(hash),
      bgHasHash: (document.body?.getAttribute('style') || '').includes(hash),
    };
  }, IMG_HASH).catch(() => null);
  if (info && (info.imgCount || info.htmlHasHash)) {
    console.log(`frame ${f.name() || f.url().slice(0, 60)}`);
    console.log(`  <img> 数量=${info.imgCount}`);
    for (const i of info.imgs) console.log(`    src=${i.src}  natural=${i.w}x${i.h}`);
    console.log(`  html 含图片标识=${info.htmlHasHash}`);
  }
}
console.log(`\n图片相关请求 ${reqs.length} 条:`);
for (const r of reqs.slice(0, 8)) console.log(`  ${r.status} ${r.ct}  ${r.url.slice(0, 110)}`);

await page.screenshot({ path: path.join(CAPTURE_DIR, 'shots/scratch_render.png'), fullPage: true });
console.log('截图 capture/shots/scratch_render.png');
await browser.close();
