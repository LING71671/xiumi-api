/**
 * probe_write.mjs — 作品写入链路验证
 *   A) 读草稿态内容 editing_show_data_url
 *   B) PUT 原样回写
 *   C) PUT 改 title
 *   D) PUT 克隆末页（加一页）
 *   然后回读确认。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Xiumi } from '../client/xiumi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SESSION = path.join(ROOT, 'capture', 'client-session.json');
const SHOW_ID = Number(process.argv[2] || 727015965);
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rec = { show_id: SHOW_ID, steps: [] };

async function put(label, api, data) {
  const meta = await api.getShow(SHOW_ID);           // 每次取最新 saved_at
  try {
    const r = await api.updateShow(meta, data);
    log(`  OK   ${label} -> ${JSON.stringify(r).slice(0, 140)}`);
    rec.steps.push({ label, ok: true, r });
    return true;
  } catch (e) {
    log(`  FAIL ${label} -> ${e.message} (code=${e.code} http=${e.status})`);
    rec.steps.push({ label, ok: false, err: String(e.message), code: e.code, status: e.status });
    return false;
  }
}

(async () => {
  const api = await Xiumi.loadSession(SESSION);
  await api._me();

  let meta = await api.getShow(SHOW_ID);
  log(`show_id=${SHOW_ID} title="${meta.title}" saved_at=${meta.saved_at}`);

  // A) 草稿态
  const ed = await api.readShowData(meta, { editing: true });
  log(`  A) 草稿态读取 status=${ed.status} keys=${ed.data && typeof ed.data === 'object' ? Object.keys(ed.data).length : typeof ed.data}`);
  fs.writeFileSync(path.join(ROOT, 'capture', 'samples', 'editing_show_data.json'), JSON.stringify(ed.data, null, 2).slice(0, 400000));
  rec.editKeys = ed.data && typeof ed.data === 'object' ? Object.keys(ed.data) : null;

  const pub = await api.readShowData(meta);
  log(`     发布态读取 status=${pub.status} keys=${pub.data && typeof pub.data === 'object' ? Object.keys(pub.data).length : typeof pub.data}`);

  const base = (ed.data && typeof ed.data === 'object') ? ed.data : pub.data;
  const pages = base?.cubes?.[0]?.pages;
  log(`     基准数据 ${ed.data ? 'editing' : 'published'}  pages=${Array.isArray(pages) ? pages.length : '-'}`);

  await sleep(400);
  await put('B) 原样回写', api, JSON.parse(JSON.stringify(base)));

  await sleep(400);
  const t = `${meta.title.replace(/\s*\[T\d+\]$/, '')} [T${Date.now() % 100000}]`;
  await put('C) 改 title', api, { ...JSON.parse(JSON.stringify(base)), title: t });

  await sleep(400);
  const d = JSON.parse(JSON.stringify(base));
  if (Array.isArray(d?.cubes?.[0]?.pages) && d.cubes[0].pages.length) {
    const clone = JSON.parse(JSON.stringify(d.cubes[0].pages[d.cubes[0].pages.length - 1]));
    d.cubes[0].pages.push(clone);
    if (Array.isArray(d.cubes[0].grounds)) {
      d.cubes[0].grounds.push(JSON.parse(JSON.stringify(d.cubes[0].grounds[d.cubes[0].grounds.length - 1] || {})));
    }
    await put(`D) 追加一页 (${d.cubes[0].pages.length})`, api, d);
  } else {
    log('  SKIP D) 无 pages');
  }

  await sleep(1500);
  meta = await api.getShow(SHOW_ID);
  const chk = await api.readShowData(meta);
  const p2 = chk.data?.cubes?.[0]?.pages?.length;
  log(`\n回读 title="${meta.title}" saved_at=${meta.saved_at}`);
  log(`     发布态 pages=${p2}  (基准 ${Array.isArray(pages) ? pages.length : '-'})`);
  rec.after = { title: meta.title, saved_at: meta.saved_at, pages: p2, base_pages: Array.isArray(pages) ? pages.length : null };
  fs.writeFileSync(path.join(ROOT, 'capture', 'probe_write.json'), JSON.stringify(rec, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
