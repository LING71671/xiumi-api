/**
 * e2e_roundtrip.mjs — 端到端验证「登录 → 读元信息 → 读内容 → 改内容 → 保存 → 回读一致」
 *
 * 用法：
 *   node scripts/e2e_roundtrip.mjs [show_id]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Xiumi } from '../client/xiumi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SESSION = path.join(ROOT, 'capture', 'client-session.json');
const OUT = path.join(ROOT, 'capture', 'e2e_roundtrip.json');

const log = (...a) => console.log(...a);
const rec = { steps: [], at: new Date().toISOString() };
function step(name, fn) {
  return (async () => {
    const t0 = Date.now();
    try {
      const v = await fn();
      rec.steps.push({ name, ok: true, ms: Date.now() - t0, sample: brief(v) });
      log(`  OK   ${name}  (${Date.now() - t0}ms)`);
      return v;
    } catch (e) {
      rec.steps.push({ name, ok: false, ms: Date.now() - t0, error: String(e.message || e), code: e.code, status: e.status, path: e.path });
      log(`  FAIL ${name}  ${e.message}${e.path ? ' @ ' + e.path : ''}${e.status ? ' HTTP' + e.status : ''}`);
      throw e;
    }
  })();
}
function brief(v) {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return `[Array len=${v.length}]`;
  if (typeof v === 'object') {
    const keys = Object.keys(v).slice(0, 12);
    return `{${keys.join(',')}${Object.keys(v).length > 12 ? ',…' : ''}}`;
  }
  return v;
}

async function boot() {
  if (fs.existsSync(SESSION)) {
    try {
      const api = await Xiumi.loadSession(SESSION);
      await api.me();
      log(`复用会话 ${SESSION}`);
      return api;
    } catch (e) {
      log(`会话失效（${e.message}），重新登录`);
    }
  }
  const j = fs.existsSync(SESSION) ? JSON.parse(fs.readFileSync(SESSION, 'utf8')) : {};
  const api = await Xiumi.login({ user: j.user, password: j.password });
  await api.saveSession(SESSION);
  return api;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let api;
  try {
    api = await boot();
  } catch (e) {
    log('登录失败：', e.message);
    process.exit(1);
  }

  const user = await step('auth.me', () => api._me());
  log(`  账号 ${user.nickname || user.phone}  unique_uid=${user.unique_uid}`);

  await step('user.info', () => api.userInfo());
  await step('sys.info', () => api.sysInfo().catch((e) => ({ _err: e.message })));
  await step('wallet.balance', () => api.walletBalance());
  await step('apikey', () => api.apiKey());

  // ---------------------------------------------------------------- 读
  const list = await step('shows.list', () => api.listShows({ type: 'paper', limit: 5 }));
  const shows = list.shows || list;
  log(`  作品数 ${Array.isArray(shows) ? shows.length : '?'}`);

  let target = process.argv[2] ? Number(process.argv[2]) : null;
  if (!target) {
    const mine = (Array.isArray(shows) ? shows : []).find((s) => s.title && s.title.includes('API'));
    target = (mine || (Array.isArray(shows) ? shows[0] : null))?.show_id;
  }
  if (!target) {
    log('没有可用的作品，跳过读写往返');
    fs.writeFileSync(OUT, JSON.stringify(rec, null, 2));
    return;
  }
  log(`  目标作品 show_id=${target}`);

  const meta = await step('shows.show(meta)', () => api.getShow(target));
  log(`  title="${meta.title}"  saved_at=${meta.saved_at}  type=${meta.type_text || meta.show_type}`);
  log(`  show_data_url=${meta.show_data_url}`);
  if (meta.editing_show_data_url) log(`  editing_show_data_url=${meta.editing_show_data_url}`);

  const r1 = await step('shows.showData(url)', () => api.readShowData(meta));
  const d1 = r1.data;
  log(`  内容 keys: ${d1 && typeof d1 === 'object' ? Object.keys(d1).slice(0, 10).join(',') : typeof d1}`);
  if (d1 && typeof d1 === 'object') {
    log(`  cubes=${Array.isArray(d1.cubes) ? d1.cubes.length : '-'}  version=${d1.version}  scene=${d1.scene}`);
  }

  // ---------------------------------------------------------------- 写（改标题 + 加一格文字）
  const stamp = new Date().toISOString().slice(0, 19);
  const d2 = JSON.parse(JSON.stringify(d1 || {}));
  d2.title = `${meta.title} [PUT ${stamp}]`;
  if (Array.isArray(d2.cubes) && d2.cubes[0] && Array.isArray(d2.cubes[0].pages)) {
    d2.cubes[0].pages.push({
      layers: [{
        comps: [{
          type: 'text',
          _comp: { tplId: 'comps:text', constraint: { mode: 'flow' } },
          txt1: { text: `API 追加于 ${stamp}` },
        }],
        _qiBlock: { type: 'group', constraint: { childLayout: 'static', frozen: true }, items: [] },
      }],
      _comp: {},
    });
    log(`  追加一页，页数 ${d2.cubes[0].pages.length}`);
  }

  const before = meta.saved_at;
  const up = await step('shows.update(PUT)', () => api.updateShow(meta, d2));
  log(`  PUT 返回：${JSON.stringify(up).slice(0, 200)}`);

  await sleep(1200); // 等服务端落盘
  const meta2 = await step('shows.show(meta#2)', () => api.getShow(target));
  log(`  新 title="${meta2.title}"  saved_at=${meta2.saved_at} (前 ${before})`);

  const r3 = await step('shows.showData(url#2)', () => api.readShowData(meta2));
  const d3 = r3.data;
  const pageDelta = (Array.isArray(d3?.cubes?.[0]?.pages) ? d3.cubes[0].pages.length : -1)
    - (Array.isArray(d1?.cubes?.[0]?.pages) ? d1.cubes[0].pages.length : -1);
  log(`  回读页数变化 ${pageDelta >= 0 ? '+' : ''}${pageDelta}`);

  rec.verify = {
    show_id: target,
    title_before: meta.title,
    title_after: meta2.title,
    put_ok: !!up,
    pages_before: Array.isArray(d1?.cubes?.[0]?.pages) ? d1.cubes[0].pages.length : null,
    pages_after: Array.isArray(d3?.cubes?.[0]?.pages) ? d3.cubes[0].pages.length : null,
    roundtrip_title_ok: String(meta2.title || '').includes('[PUT'),
  };
  log(`\n  往返结论：title 已更新 = ${rec.verify.roundtrip_title_ok}`);

  fs.writeFileSync(OUT, JSON.stringify(rec, null, 2));
  log(`\n报告 -> ${OUT}`);
})().catch((e) => {
  console.error('\n中断：', e);
  try {
    fs.writeFileSync(OUT, JSON.stringify(rec, null, 2));
  } catch { /* ignore */ }
  process.exit(1);
});
