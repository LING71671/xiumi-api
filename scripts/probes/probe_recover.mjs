/**
 * probe_recover.mjs — 确认 recover 用的是 deleted_show_id 还是 orig_show_id
 * 同时顺手清理测试遗留的删除项。
 */
import path from 'node:path';
import fs from 'node:fs';
import { Xiumi } from '../client/xiumi.mjs';
import { CAPTURE_DIR, SESSION_FILE } from '../cfg.mjs';
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const api = await Xiumi.loadSession(SESSION_FILE);
  await api._me();

  const listRaw = await api.request('GET', '/api/shows/deleted/shows', { query: { limit: 50, page: 0 }, raw: true });
  const payload = listRaw.data || listRaw;
  const rows = payload.deletedShows || [];
  log(`回收站 count=${payload.count} 本次返回=${rows.length}`);
  for (const r of rows.slice(0, 6)) {
    log(`  deleted_show_id=${r.deleted_show_id}  orig_show_id=${r.orig_show_id}  title="${r.title}"`);
  }

  const target = rows[0];
  if (!target) { log('回收站为空，结束'); return; }

  // 试 A：deleted_show_id
  const a = await api.recoverShow(target.deleted_show_id).catch((e) => ({ _err: e.message, code: e.code }));
  log(`\nrecoverShow(deleted_show_id=${target.deleted_show_id}) -> ${JSON.stringify(a).slice(0, 160)}`);
  await sleep(600);
  const visA = await api.getShow(target.orig_show_id).then((m) => `visible: ${m.title}`).catch((e) => `gone(${e.message})`);
  log(`  GET /api/shows/${target.orig_show_id} -> ${visA}`);

  let restored = String(visA).startsWith('visible');

  if (!restored) {
    const b = await api.recoverShow(target.orig_show_id).catch((e) => ({ _err: e.message, code: e.code }));
    log(`\nrecoverShow(orig_show_id=${target.orig_show_id}) -> ${JSON.stringify(b).slice(0, 160)}`);
    await sleep(600);
    const visB = await api.getShow(target.orig_show_id).then((m) => `visible: ${m.title}`).catch((e) => `gone(${e.message})`);
    log(`  GET -> ${visB}`);
    restored = String(visB).startsWith('visible');
  }

  // 清理：恢复回来的测试作品再删一次
  if (restored) {
    const d = await api.deleteShow(target.orig_show_id).catch((e) => ({ _err: e.message }));
    log(`\n清理 deleteShow(${target.orig_show_id}) -> ${JSON.stringify(d).slice(0, 100)}`);
  }
  fs.writeFileSync(path.join(CAPTURE_DIR, 'probe_recover.json'),
    JSON.stringify({ count: payload.count, rows: rows.slice(0, 6), recoveredVia: restored ? 'ok' : 'fail' }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
