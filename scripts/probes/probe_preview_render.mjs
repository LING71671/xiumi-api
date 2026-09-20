/**
 * probe_preview_render.mjs — 用登录态打开作品预览页，确认 API 写入的文本真的渲染出来
 */
import path from 'node:path';
import { chromium } from 'playwright-core';
import { CHROMIUM_PATH, launchOptions } from '../cfg.mjs';
import { Xiumi } from '../client/xiumi.mjs';

const SHOW_ID = Number(process.argv[2] || 727019992);
const MARK = process.argv[3] || 'XMRK';

const api = await Xiumi.loadSession(SESSION_FILE);
const me = await api._me();
const meta = await api.getShow(SHOW_ID);
console.log(`show_id=${SHOW_ID}  title="${meta.title}"`);
console.log(`show_url=${meta.show_url}`);
console.log(`edit_url=${meta.edit_url}`);

const pv = await api.previewUri(`/shows/${SHOW_ID}`).catch((e) => ({ _err: e.message }));
console.log(`previewUri -> ${JSON.stringify(pv).slice(0, 200)}`);
const previewUrl = typeof pv === 'string' ? pv : pv?.uri || pv?.url;

const browser = await chromium.launch({ ...launchOptions, executablePath: CHROMIUM_PATH });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
await ctx.addCookies([{ name: 'sid', value: api.sid, domain: '.xiumi.us', path: '/', httpOnly: true, secure: true, sameSite: 'None' }]);

const abs = (u) => (!u ? null : u.startsWith('//') ? `https:${u}` : u.startsWith('/') ? `https://xiumi.us${u}` : u);

async function scan(url, label) {
  const page = await ctx.newPage();
  try {
    await page.goto(abs(url), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000);
    const out = [];
    for (const f of page.frames()) {
      const t = await f.evaluate(() => document.body?.innerText || '').catch(() => '');
      out.push({ frame: f.name() || f.url().slice(0, 70), len: t.length, hit: t.includes(MARK), head: t.slice(0, 200) });
    }
    const html = await page.content();
    console.log(`\n[${label}] ${abs(url)}`);
    console.log(`  frames=${page.frames().length}  html含标记=${html.includes(MARK)}`);
    for (const o of out) console.log(`  frame ${o.frame}  len=${o.len} 含标记=${o.hit}  head=${JSON.stringify(o.head)}`);
    await page.screenshot({ path: path.join(CAPTURE_DIR, `shots/preview_${label}.png`), fullPage: true });
    return out.some((o) => o.hit) || html.includes(MARK);
  } catch (e) {
    console.log(`\n[${label}] 失败: ${e.message}`);
    return false;
  } finally {
    await page.close();
  }
}

let hit = false;
if (previewUrl) hit = await scan(previewUrl, 'preview');
if (!hit && meta.edit_url) hit = await scan(meta.edit_url, 'edit');
if (!hit) hit = await scan(meta.show_url, 'show');

console.log(`\n渲染含写入文本 = ${hit}`);
await browser.close();
