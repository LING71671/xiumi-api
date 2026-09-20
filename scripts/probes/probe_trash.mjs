/**
 * probe_trash.mjs — 删除 / 回收站 / 恢复 的真实语义
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
  const out = {};

  const c = await api.createBlankShow('paper', `回收站语义测试 ${Date.now() % 100000}`);
  const sid = c.show_id;
  log(`创建 show_id=${sid}  title=${c.title}`);
  out.created = sid;

  const before = await api.deletedShows({ limit: 100 });
  log(`删除前回收站: ${JSON.stringify(before).slice(0, 300)}`);

  const d = await api.deleteShow(sid).catch((e) => ({ _err: e.message, code: e.code }));
  log(`DELETE -> ${JSON.stringify(d).slice(0, 200)}`);
  out.delete = d;

  await sleep(400);
  const g = await api.getShow(sid).then(() => 'visible').catch((e) => `gone(${e.message})`);
  log(`删除后 GET /api/shows/${sid} -> ${g}`);
  out.afterDeleteGet = g;

  const after = await api.deletedShows({ limit: 100 });
  const list = after?.shows || after || [];
  const hit = Array.isArray(list) ? list.filter((s) => Number(s.show_id) === Number(sid)) : [];
  log(`删除后回收站: len=${Array.isArray(list) ? list.length : '?'} 命中=${hit.length}`);
  out.trashLen = Array.isArray(list) ? list.length : null;
  out.trashHit = hit.length;
  if (Array.isArray(list) && list.length) log(`  样本: ${JSON.stringify(list[0]).slice(0, 300)}`);

  const rec = await api.recoverShow(sid).catch((e) => ({ _err: e.message, code: e.code, status: e.status }));
  log(`recoverShow -> ${JSON.stringify(rec).slice(0, 200)}`);
  out.recover = rec;

  const res = await api.restoreShow(sid).catch((e) => ({ _err: e.message, code: e.code, status: e.status }));
  log(`restoreShow -> ${JSON.stringify(res).slice(0, 200)}`);
  out.restore = res;

  await sleep(500);
  const g2 = await api.getShow(sid).then((m) => `visible title=${m.title}`).catch((e) => `gone(${e.message})`);
  log(`最终 GET -> ${g2}`);
  out.final = g2;

  // 若仍可见，清理掉
  if (String(g2).startsWith('visible')) {
    const d2 = await api.deleteShow(sid).catch((e) => ({ _err: e.message }));
    log(`二次清理 -> ${JSON.stringify(d2).slice(0, 120)}`);
  }
  fs.writeFileSync(path.join(CAPTURE_DIR, 'probe_trash.json'), JSON.stringify(out, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
