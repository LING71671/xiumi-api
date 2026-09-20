// smoke.mjs — 冒烟测试：能否启动 Chromium 并访问 xiumius.cn
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { CAPTURE_DIR, launchOptions, contextOptions, BASE, ensureDirs } from './cfg.mjs';
import { Recorder } from './recorder.mjs';

ensureDirs();

const browser = await chromium.launch(launchOptions);
const ctx = await browser.newContext(contextOptions);
const rec = new Recorder(CAPTURE_DIR, 'smoke');
const page = await ctx.newPage();
rec.attach(page);

try {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
  console.log('URL   :', page.url());
  console.log('TITLE :', await page.title());

  const info = await page.evaluate(() => ({
    cookies: document.cookie,
    ls: Object.keys(localStorage),
    ss: Object.keys(sessionStorage),
    scripts: [...document.querySelectorAll('script[src]')].map((s) => s.src),
    links: document.querySelectorAll('a[href]').length,
    bodyLen: document.body.innerText.length,
  }));
  console.log('SCRIPTS:', info.scripts.length);
  info.scripts.slice(0, 40).forEach((s) => console.log('  ', s));
  console.log('localStorage:', info.ls);
  console.log('sessionStorage:', info.ss);
  console.log('cookie:', info.cookies.slice(0, 300));
  console.log('bodyLen:', info.bodyLen);
  console.log('--- 可见文本前 1500 字 ---');
  console.log((await page.evaluate(() => document.body.innerText)).slice(0, 1500));

  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(CAPTURE_DIR, 'smoke-home.png'), fullPage: false });
} catch (e) {
  console.error('SMOKE FAILED:', e.message);
} finally {
  await rec.flush();
  await ctx.storageState({ path: path.join(CAPTURE_DIR, 'storage_state.json') }).catch(() => {});
  const s = rec.summary();
  console.log('\n--- API 候选（冒烟阶段） ---');
  s.slice(0, 60).forEach((x) => console.log(`  ${x.key}  [${x.statuses.join(',')}] x${x.count}`));
  console.log('总条目:', rec.entries.length, '唯一接口:', s.length);
  await browser.close();
}
