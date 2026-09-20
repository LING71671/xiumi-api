/**
 * probe_official_comp.mjs — 用官方模板库的 matrix 构造「文本 + 图片」作品，验证是否真的渲染
 */
import path from 'node:path';
import fs from 'node:fs';
import { Xiumi, newCompUuid } from '../client/xiumi.mjs';
import { chromium } from 'playwright-core';
import { CHROMIUM_PATH, launchOptions } from '../cfg.mjs';

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MARK = `IMG${Date.now() % 1000000}`;

const api = await Xiumi.loadSession(SESSION_FILE);
await api._me();

// 1. 上传图片
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const up = await api.uploadImageBase64(Buffer.from(PNG, 'base64'), `oimg_${Date.now()}.png`);
log('上传 ->', JSON.stringify(up).slice(0, 180));
const url = up.target_uri;
const hash = String(url).split('/').pop();

// 2. 从官方模板库取组件（不手写任何 tplId）
const comps = [];
comps.push(await api.templateComp('paper-cp:header/1-txt-normal', (c) => {
  c.txt1.text = `<p style="text-align:center"><strong>${MARK}</strong></p><p>组件来自官方模板库的 matrix。</p>`;
}));
comps.push(await api.templateComp('paper-cp:image/001-img-center', (c) => { c.img1.src = url; }));
comps.push(await api.templateComp('paper-cp:basic/split-line', () => {}));
comps.push(await api.templateComp('paper-cp:basic/h2', (c) => { if (c.txt1) c.txt1.text = '二级标题（官方模板）'; }));
log(`\n取到 ${comps.length} 个官方组件：`);
for (const c of comps) {
  const k = Object.keys(c).filter((x) => x !== '_comp');
  log(`  tplId=${c._comp.tplId}  fields=[${k.join(',')}]  raHTML=${(c._comp._$raHTML || '').length}`);
}

// 3. 从零构造并保存
const show = api.buildShow('paper', `${MARK} 官方组件构造`);
show.cubes[0].pages[0].layers[0].comps.items.push(...comps);

const created = await api.createShow('paper', show).catch((e) => ({ _err: e.message, code: e.code }));
if (created._err) { log('创建失败:', created._err, created.code); process.exit(1); }
const sid = created.show_id;
log(`\n创建 show_id=${sid}  编辑器：${created.edit_url}`);
await sleep(1500);
const meta = await api.getShow(sid);

// 4. 回读结构
const { data } = await api.readShowData(meta, { editing: true });
const items = data.cubes[0].pages[0].layers.flatMap((l) => l.comps?.items || []);
log(`回读 items=${items.length}`);
for (const c of items) {
  const k = Object.keys(c).filter((x) => x !== '_comp');
  log(`  tplId=${c._comp.tplId} fields=[${k.join(',')}] ${JSON.stringify(c.img1 || c.txt1 || {}).slice(0, 110)}`);
}

// 5. 浏览器渲染检查
const browser = await chromium.launch({ ...launchOptions, executablePath: CHROMIUM_PATH });
const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 } });
await ctx.addCookies([{ name: 'sid', value: api.sid, domain: '.xiumi.us', path: '/', httpOnly: true, secure: true, sameSite: 'None' }]);
const page = await ctx.newPage();
const reqs = [];
page.on('response', (r) => { if (r.url().includes('img.xiumi.us')) reqs.push({ url: r.url(), status: r.status() }); });
await page.goto(`https://xiumi.us${meta.edit_url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(9000);

const report = { mark: MARK, show_id: sid, edit_url: meta.edit_url, image_url: url, frames: [] };
for (const f of page.frames()) {
  const info = await f.evaluate((h) => {
    const out = { text: (document.body?.innerText || '').slice(0, 400), imgs: [] };
    for (const i of document.querySelectorAll('img,tc-img,div')) {
      const s = i.getAttribute('src') || i.getAttribute('data-src') || '';
      if (s.includes(h)) out.imgs.push({ tag: i.tagName, src: s.slice(0, 120), w: i.naturalWidth || 0 });
    }
    return out;
  }, hash).catch(() => null);
  if (info && (info.imgs.length || info.text.trim())) {
    report.frames.push({ frame: f.name() || f.url().slice(0, 60), imgs: info.imgs, textHead: info.text.slice(0, 220) });
  }
}
const hit = report.frames.some((fr) => fr.textHead.includes(MARK));
log(`\n编辑器内 textHead 含标记 = ${hit}`);
for (const fr of report.frames) {
  if (!fr.imgs.length && !fr.textHead) continue;
  log(`  frame ${fr.frame}`);
  log(`    text: ${JSON.stringify(fr.textHead)}`);
  log(`    含目标图的元素: ${fr.imgs.length}  ${JSON.stringify(fr.imgs.slice(0, 3))}`);
}
log(`\nimg.xiumi.us 请求 ${reqs.length} 条:`);
reqs.slice(0, 6).forEach((r) => log(`  ${r.status} ${r.url.slice(0, 100)}`));

const realImg = reqs.some((r) => r.url.includes(hash));
log(`\n★ 编辑器真的去加载了我们上传的图片 = ${realImg}`);
await page.screenshot({ path: path.join(CAPTURE_DIR, 'shots/official_img_render.png'), fullPage: true });
report.image_loaded = realImg;
fs.writeFileSync(path.join(CAPTURE_DIR, 'probe_official_comp.json'), JSON.stringify(report, null, 2));
log(`截图 capture/shots/official_img_render.png`);
await browser.close();
