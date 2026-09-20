/**
 * probe_render.mjs — 用浏览器打开作品公开页，确认 API 写入的文本真的渲染出来了
 */
import path from 'node:path';
import { chromium } from 'playwright-core';
import { CHROMIUM_PATH, launchOptions } from '../cfg.mjs';

const URL_ = process.argv[2];
const MARK = process.argv[3];
if (!URL_) { console.error('用法: node scripts/probe_render.mjs <show_url> [mark]'); process.exit(1); }

const browser = await chromium.launch({ ...launchOptions, executablePath: CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
try {
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  const text = await page.evaluate(() => document.body.innerText);
  const html = await page.content();
  console.log('URL        :', URL_);
  console.log('frames     :', page.frames().length);
  for (const f of page.frames()) {
    const t = await f.evaluate(() => document.body?.innerText || '').catch(() => '');
    if (t && t.trim()) console.log(`  frame[${f.name() || f.url().slice(0, 60)}] textLen=${t.length} 含标记=${MARK ? t.includes(MARK) : '-'}`);
  }
  console.log('body text  :', JSON.stringify(text.slice(0, 600)));
  console.log('含标记     :', MARK ? text.includes(MARK) : '(未提供)');
  console.log('html 含标记:', MARK ? html.includes(MARK) : '-');
  await page.screenshot({ path: path.join(CAPTURE_DIR, 'shots/render_check.png'), fullPage: true });
  console.log('截图       : capture/shots/render_check.png');
} finally {
  await browser.close();
}
