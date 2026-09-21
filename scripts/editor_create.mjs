// editor_create.mjs — 在编辑器里完成一次最小内容创作并保存，抓下完整的「新建 + 保存」接口载荷
// 用法: node scripts/editor_create.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { CAPTURE_DIR, STATE_FILE, launchOptions, contextOptions } from './cfg.mjs';
import { Recorder } from './recorder.mjs';

const TITLE = 'API 客户端验证样例';
const BODY = '这是通过 API 客户端写入的内容。';

const browser = await chromium.launch(launchOptions);
const ctx = await browser.newContext({ ...contextOptions, storageState: STATE_FILE });
const rec = new Recorder(CAPTURE_DIR, 'editor-create');
const page = await ctx.newPage();
rec.attach(page);

const log = (...a) => { console.log(...a); };
const out = { ok: false };

try {
  await page.goto('https://xiumi.us/studio/v5/paper', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(12000);
  log('[1] 编辑器加载:', page.url());

  // 写正文：点进文本单元格后直接输入
  const cell = page.locator('.tn-cell-text[contenteditable="true"]').first();
  if (await cell.count()) {
    await cell.click({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.keyboard.type(TITLE, { delay: 20 });
    await page.keyboard.press('Enter');
    await page.keyboard.type(BODY, { delay: 20 });
    log('[2] 已输入正文');
  } else {
    log('[2] 未找到可编辑单元格，改为全局输入');
    await page.keyboard.type(TITLE, { delay: 20 });
  }
  await page.waitForTimeout(1500);

  // 填标题（预览/分享设置里的 title 输入框）
  const titleInput = page.locator('input.form-control.title').first();
  if (await titleInput.count()) {
    await titleInput.fill(TITLE).catch(() => {});
    log('[3] 已填标题');
  }

  const before = rec.entries.length;
  await page.locator('button.btn-img', { hasText: '保存' }).first().click({ timeout: 15000 }).catch((e) => log('保存按钮点击异常:', e.message));
  log('[4] 已点击保存，等待写请求…');
  await page.waitForTimeout(9000);

  const writes = rec.entries.filter((e) => e.kind === 'response' && e.method !== 'GET'
    && /\/(api|auth)\//.test(e.url) && !/tagsorder|order/.test(e.url));
  for (const w of writes) {
    const u = new URL(w.url);
    log('  →', w.method, w.status, u.pathname + u.search);
    if (w.requestPostData) log('     body:', w.requestPostData.slice(0, 1200));
    if (w.body) log('     resp:', w.body.slice(0, 600));
  }
  out.writes = writes.map((w) => ({ method: w.method, url: w.url, status: w.status, body: w.requestPostData, response: w.body }));
  out.ok = writes.length > 0;
  out.title = TITLE;

  // 用列表接口确认作品真的建出来了
  const list = await ctx.request.get('https://xiumi.us/api/shows?show_type=paper&limit=5&offset=0', {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  const lj = await list.json().catch(() => null);
  const shows = lj?.data?.shows || lj?.data || [];
  log('[5] 我的图文列表:', Array.isArray(shows) ? shows.map((s) => `${s.show_id}:${s.title}`).join(' | ') : JSON.stringify(lj).slice(0, 300));
  out.shows = Array.isArray(shows) ? shows.map((s) => ({ show_id: s.show_id, title: s.title, type_text: s.type_text })) : lj;

  await page.screenshot({ path: path.join(CAPTURE_DIR, 'shots', 'editor-created.png') });
} catch (e) {
  out.error = String(e.message || e);
  console.error('[失败]', out.error);
} finally {
  await rec.flush();
  fs.writeFileSync(path.join(CAPTURE_DIR, 'editor_create_result.json'), JSON.stringify(out, null, 2));
  await browser.close();
}
console.log('结果:', out.ok ? '捕获到写请求' : '未捕获');
