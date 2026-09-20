// explore.mjs — 登录态下遍历全站路由，录制所有 XHR
// 用法: node scripts/explore.mjs [only=keyword]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { CAPTURE_DIR, STATE_FILE, launchOptions, contextOptions, ensureDirs } from './cfg.mjs';
import { Recorder } from './recorder.mjs';

ensureDirs();
if (!fs.existsSync(STATE_FILE)) throw new Error('缺少登录态，先运行 scripts/login.mjs');

// 路由清单：来自 bundle 中 ui-router state 定义 + 首页入口
const ROUTES = [
  ['home', '/'],
  ['studio-papers', '/#/studio/papers'],
  ['studio-manuscripts', '/#/studio/manuscripts'],
  ['studio-booklets', '/#/studio/booklets'],
  ['studio-tablets', '/#/studio/tablets'],
  ['studio-placards', '/#/studio/placards'],
  ['studio-recycle', '/#/studio/recycle'],
  ['studio-shop-paper', '/#/studio/shop/paper'],
  ['studio-shop-paper-favorite', '/#/studio/shop/paper/favorite'],
  ['studio-shop-paper-purchase', '/#/studio/shop/paper/purchase'],
  ['studio-shop-tablet', '/#/studio/shop/tablet'],
  ['studio-shop-placard', '/#/studio/shop/placard'],
  ['studio-teams', '/#/studio/teams'],
  ['studio-userhome', '/#/studio/userhome'],
  ['studio-userhome-setup', '/#/studio/userhome/setup'],
  ['user-messages', '/#/user/messages'],
  ['user-messages-setting', '/#/user/messages/setting'],
  ['user-setting', '/#/user/setting'],
  ['user-contacts', '/#/user/contacts'],
  ['user-showgoods', '/#/user/showgoods'],
  ['user-upgrade', '/#/user/upgrade'],
  ['user-recharge', '/#/user/recharge'],
  ['user-redeem', '/#/user/redeem'],
  ['user-transfer', '/#/user/transfer'],
  ['user-history-bills', '/#/user/history_bills'],
  ['user-tpl-member', '/#/user/tpl_member'],
  ['user-traffic-package', '/#/user/traffic_package'],
  ['user-apikey', '/#/user/apikey'],
  ['user-publisher-identity', '/#/user/publisher_identity'],
  ['user-author-qualification', '/#/user/author_qualification'],
  ['user-partnerbind', '/#/user/partnerbind'],
  ['user-ownerpartnerbind', '/#/user/ownerpartnerbind'],
  ['user-identity-application', '/#/user/identity_application'],
  ['order', '/#/order'],
  ['invoice', '/#/invoice'],
  ['studio-userhome-index', '/#/studio/userhome?page=1'],
  ['editor-paper', '/studio/v5/paper'],
  ['editor-tablet', '/studio/v5/tablet'],
];

const only = (process.argv.find((a) => a.startsWith('only=')) || '').split('=')[1];
const list = only ? ROUTES.filter(([n]) => n.includes(only)) : ROUTES;

const browser = await chromium.launch(launchOptions);
const ctx = await browser.newContext({ ...contextOptions, storageState: STATE_FILE });
const rec = new Recorder(CAPTURE_DIR, 'explore');
const results = [];

// 捕获新开的标签页/弹窗
ctx.on('page', (p) => rec.attach(p));

const page = await ctx.newPage();
rec.attach(page);

let n = 0;
for (const [name, route] of list) {
  n++;
  const url = 'https://xiumi.us' + route;
  const before = rec.entries.length;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3500);
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch { /* 忽略不空闲 */ }
    await page.waitForTimeout(1500);
    const title = await page.title();
    const textLen = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
    const newReq = rec.entries.length - before;
    rec.note(`ROUTE ${name} ${url} -> title=${title} textLen=${textLen} newEntries=${newReq}`);
    console.log(`[${n}/${list.length}] ${name.padEnd(30)} ok  title="${title.slice(0, 40)}" text=${textLen} +${newReq}`);
    await page.screenshot({ path: path.join(CAPTURE_DIR, 'shots', `${String(n).padStart(2, '0')}-${name}.png`) }).catch(() => {});
    results.push({ name, route, url, ok: true, title, textLen, newEntries: newReq });
  } catch (e) {
    console.log(`[${n}/${list.length}] ${name.padEnd(30)} ERR ${String(e.message).slice(0, 120)}`);
    rec.note(`ROUTE ${name} ${url} -> ERROR ${e.message}`);
    results.push({ name, route, url, ok: false, error: String(e.message).slice(0, 300) });
  }
}

await rec.flush();
fs.writeFileSync(path.join(CAPTURE_DIR, 'explore_result.json'), JSON.stringify(results, null, 2));
await ctx.storageState({ path: STATE_FILE });
await browser.close();

console.log('\n=== 遍历完成 ===');
console.log('成功:', results.filter((r) => r.ok).length, '/', results.length);
const s = rec.summary();
console.log('唯一接口:', s.length, ' 总条目:', rec.entries.length);
fs.writeFileSync(path.join(CAPTURE_DIR, 'explore_api_summary.txt'), s.map((x) => `${x.key}\t[${x.statuses.join(',')}]\tx${x.count}\t${x.sample}`).join('\n'));
