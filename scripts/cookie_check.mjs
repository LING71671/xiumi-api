// cookie_check.mjs — 排查浏览器页面内 fetch 为何 401
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { CAPTURE_DIR, STATE_FILE, launchOptions, contextOptions } from './cfg.mjs';

const browser = await chromium.launch(launchOptions);
const ctx = await browser.newContext({ ...contextOptions, storageState: STATE_FILE });
const page = await ctx.newPage();

const cookies = await ctx.cookies();
console.log('storageState cookie:', cookies.map((c) => `${c.name}@${c.domain}${c.path} sameSite=${c.sameSite} secure=${c.secure}`).join(' | '));

await page.goto('https://xiumi.us/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
const fromHome = await page.evaluate(async () => {
  const r = await fetch('/api/user/info?include=userSetting', { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' });
  return { status: r.status, body: (await r.text()).slice(0, 200), cookie: document.cookie };
});
console.log('从 xiumi.us 首页 fetch:', JSON.stringify(fromHome));

await page.goto('https://xiumi.us/studio/v5#/paper/for/new/cube/0', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);
const fromEditor = await page.evaluate(async () => {
  const r = await fetch('/api/user/info?include=userSetting', { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' });
  return { status: r.status, body: (await r.text()).slice(0, 200), cookie: document.cookie, url: location.href };
});
console.log('从编辑器 fetch:', JSON.stringify(fromEditor));

const me = await ctx.request.get('https://xiumi.us/auth/me');
console.log('APIRequestContext /auth/me:', me.status(), (await me.text()).slice(0, 120));

await browser.close();
