/**
 * probe_textedit.mjs — 验证「改作品正文文本」这条内容创作路径
 *
 * 步骤：
 *   1. 从已有作品里克隆第 0 页，作为新作品的初始内容
 *   2. POST /api/shows/v5/paper 新建
 *   3. 改 txt1.text（只改结构化字段，不动 _$raHTML）→ PUT
 *   4. 回读 editing 数据，确认文本落库
 *   5. 拉公开作品页 show_url，grep 新文本，判断渲染是否跟随
 *   6. 若渲染未跟随，再补改 _$raHTML 后 PUT，再次核对
 */
import path from 'node:path';
import fs from 'node:fs';
import { Xiumi } from '../client/xiumi.mjs';
import { CAPTURE_DIR, SESSION_FILE } from '../cfg.mjs';

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MARK = `XMRK${Date.now() % 1000000}`;
const rec = { mark: MARK, steps: [] };
const BASE_ID = Number(process.argv[2] || 727015965);

async function fetchText(url) {
  const u = url.startsWith('//') ? `https:${url}` : url;
  const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  return r.text();
}

(async () => {
  const api = await Xiumi.loadSession(SESSION_FILE);
  await api._me();

  // 1. 取模板内容
  const srcMeta = await api.getShow(BASE_ID);
  const { data: src } = await api.readShowData(srcMeta, { editing: true });
  const layer = src.cubes[0].pages[0].layers[0];
  const cell = layer.comps.items[0];
  log(`模板页取自 show ${BASE_ID}，首个组件 tplId=${cell._comp.tplId}`);
  log(`原文本: ${JSON.stringify(cell.txt1.text).slice(0, 140)}`);
  rec.originalText = cell.txt1.text;

  // 2. 新建作品（克隆整份数据，换标题）
  const created = await api.createShow('paper', { ...src, title: `API 内容创作验证 ${MARK}` });
  const sid = created.show_id;
  log(`\n新建 show_id=${sid}  title="${created.title}"`);
  rec.show_id = sid;
  rec.edit_url = created.edit_url;
  rec.show_url = created.show_url;

  await sleep(1200);
  let meta = await api.getShow(sid);
  log(`show_url=${meta.show_url}`);

  // 3. 改文本（只改 txt1.text）
  const { data: cur } = await api.readShowData(meta, { editing: true });
  const cell2 = cur.cubes[0].pages[0].layers[0].comps.items[0];
  const OLD = cell2.txt1.text;
  cell2.txt1.text = `<p>${MARK} 第一版（仅改 txt1）</p>`;
  const put1 = await api.updateShow(meta, cur).catch((e) => ({ _err: e.message, code: e.code }));
  log(`PUT#1 (仅改 txt1) -> ${typeof put1 === 'string' ? put1 : JSON.stringify(put1).slice(0, 120)}`);
  rec.put1 = typeof put1 === 'string' ? put1 : String(put1._err || 'ok');

  await sleep(1500);
  meta = await api.getShow(sid);
  const { data: a } = await api.readShowData(meta, { editing: true });
  const gotTxt = a.cubes[0].pages[0].layers[0].comps.items[0].txt1.text;
  log(`回读 editing 文本: ${JSON.stringify(gotTxt).slice(0, 120)}`);
  rec.afterPut1_editing_text = gotTxt;

  const { data: b } = await api.readShowData(meta);
  const pubTxt = b.cubes[0].pages[0].layers[0].comps.items[0].txt1.text;
  log(`回读 published 文本: ${JSON.stringify(pubTxt).slice(0, 120)}`);
  rec.afterPut1_published_text = pubTxt;

  // 5. 看渲染页
  let page = '';
  try {
    page = await fetchText(meta.show_url);
    log(`公开页 HTML 长度 ${page.length}`);
  } catch (e) {
    log(`公开页拉取失败: ${e.message}`);
  }
  const renderHit = page.includes(MARK);
  const renderOld = page.includes('API 客户端验证样例');
  log(`公开页含新标记=${renderHit}  含旧文本=${renderOld}`);
  rec.afterPut1_render_new = renderHit;
  rec.afterPut1_render_old = renderOld;
  fs.writeFileSync(path.join(CAPTURE_DIR, 'samples/render_after_put1.html'), page);

  if (!renderHit) {
    log('\n渲染未跟随 → 补改 _$raHTML 后再 PUT');
    await sleep(800);
    meta = await api.getShow(sid);
    const { data: d2 } = await api.readShowData(meta, { editing: true });
    const c3 = d2.cubes[0].pages[0].layers[0].comps.items[0];
    c3.txt1.text = `<p>${MARK} 第二版（txt1 + raHTML）</p>`;
    const raLen0 = (c3._comp._$raHTML || '').length;
    c3._comp._$raHTML = String(c3._comp._$raHTML || '').replace(OLD, `<p>${MARK} 第二版（txt1 + raHTML）</p>`);
    log(`  _$raHTML 长度 ${raLen0} -> ${c3._comp._$raHTML.length}  (被替换=${c3._comp._$raHTML.length !== raLen0})`);
    const put2 = await api.updateShow(meta, d2).catch((e) => ({ _err: e.message, code: e.code }));
    log(`PUT#2 -> ${typeof put2 === 'string' ? put2 : JSON.stringify(put2).slice(0, 120)}`);
    rec.put2 = typeof put2 === 'string' ? put2 : String(put2._err || 'ok');
    rec.raHTML_patched = c3._comp._$raHTML.length !== raLen0;

    await sleep(1800);
    meta = await api.getShow(sid);
    try {
      page = await fetchText(meta.show_url);
      const hit2 = page.includes(MARK);
      log(`公开页含新标记=${hit2}`);
      rec.afterPut2_render_new = hit2;
      fs.writeFileSync(path.join(CAPTURE_DIR, 'samples/render_after_put2.html'), page);
    } catch (e) {
      log(`公开页拉取失败: ${e.message}`);
    }
  }

  rec.final_show_url = meta.show_url;
  fs.writeFileSync(path.join(CAPTURE_DIR, 'probe_textedit.json'), JSON.stringify(rec, null, 2));
  log(`\n作品页: ${meta.show_url}`);
  log(`记录 -> capture/probe_textedit.json`);
})().catch((e) => { console.error(e); process.exit(1); });
