// api_probe.mjs — 用登录态对接口做「只读 GET 验证」，补齐静态分析拿不到的字段与状态码
// 只发 GET，不发任何写请求。用法: node scripts/api_probe.mjs
import { request } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, CAPTURE_DIR, STATE_FILE, PROXY, UA } from './cfg.mjs';

const OUT = path.join(ROOT, 'data');
const data = JSON.parse(fs.readFileSync(path.join(OUT, 'endpoints.json'), 'utf8'));
const live = fs.existsSync(path.join(OUT, 'live_endpoints.json'))
  ? JSON.parse(fs.readFileSync(path.join(OUT, 'live_endpoints.json'), 'utf8')) : { endpoints: [] };
const liveKeys = new Set(live.endpoints.map((e) => `${e.method} ${e.path}`));

// ---------- 收集真实 ID 用于替换路径参数 ----------
const ctx = await request.newContext({
  storageState: STATE_FILE,
  proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true,
  extraHTTPHeaders: { 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json, text/plain, */*' },
});

const me = await ctx.get('https://xiumi.us/auth/me');
const meJson = await me.json().catch(() => null);
const meUser = meJson?.data?.user || null;

// 从已录制流量里找真实 ID
const ids = {
  show_id: null, team_id: null, show_goods_id: null, tag_id: null, invoice_id: null,
  order_id: null, u_sid: meUser?.user_sid || null, show_type: 'paper',
};
try {
  const listR = await ctx.get('https://xiumi.us/api/shows?show_type=paper&limit=3&offset=0');
  const listJ = await listR.json();
  const arr = listJ?.data?.shows || listJ?.data || [];
  if (Array.isArray(arr) && arr[0]?.show_id) ids.show_id = arr[0].show_id;
} catch { /* 忽略 */ }
try {
  const tR = await ctx.get('https://xiumi.us/api/teams');
  const tJ = await tR.json();
  const arr = tJ?.data?.teams || tJ?.data || [];
  if (Array.isArray(arr) && arr[0]?.team_id) ids.team_id = arr[0].team_id;
} catch { /* 忽略 */ }

console.log('会话用户:', meUser ? `${meUser.user_sid} ${meUser.nickname}` : '（未登录？）');
console.log('探针 ID:', JSON.stringify(ids));

// ---------- 逐个探测 ----------
const SUB = {
  show_id: ids.show_id || '0', team_id: ids.team_id || '0', u_sid: ids.u_sid || '0',
  show_goods_id: '0', tag_id: '0', invoice_id: '0', order_id: '0', show_type: 'paper',
  asset_id: '0', message_id: '0', contact_id: '0', exhibit_id: '0', partner_app_id: '0',
};

// 危险端点黑名单：这些路径段即使声明为 GET 也会改变服务端状态，
// 探测时必须跳过（实测踩坑：GET /auth/logout 会把自己登出）。
const UNSAFE_SEG = new Set([
  'logout', 'login', 'signin', 'signout', 'unbind', 'bind', 'frozen', 'freeze', 'delete', 'deleted',
  'remove', 'clear', 'cancel', 'quit', 'reset', 'recover', 'restore', 'transfer', 'pay', 'payment',
  'withdraw', 'recharge', 'redeem', 'stop', 'revoke', 'trash', 'rename', 'change', 'save', 'create',
  'add', 'set', 'upgrade', 'import', 'consume', 'send', 'on', 'off', 'copy', 'fork', 'empty', 'drop',
  'edit', 'update', 'patch', 'assign_tags', 'stopSale', 'tagsset', 'on_page', 'off_page',
]);
function isUnsafe(pathStr) {
  return pathStr.split('/').filter(Boolean).some((s) => UNSAFE_SEG.has(s) || UNSAFE_SEG.has(s.toLowerCase()));
}

const results = [];
for (const ep of data.endpoints) {
  const methods = ep.methods.length ? ep.methods : ['GET'];
  if (isUnsafe(ep.path)) {
    results.push({ path: ep.path, method: 'GET', skipped: '危险端点（可能改变状态），未探测' });
    continue;
  }
  if (!methods.includes('GET')) { results.push({ path: ep.path, method: 'GET', skipped: '非 GET 接口，未探测' }); continue; }
  if (ep.path.includes('{')) {
    // 需要 ID 的接口只探测能填出真实值的
    const need = [...ep.path.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]);
    if (need.some((n) => !SUB[n] || SUB[n] === '0')) {
      results.push({ path: ep.path, method: 'GET', skipped: `缺少路径参数 ${need.join(',')}` });
      continue;
    }
  }
  let url = ep.path.replace(/\{([a-z_0-9]+)\}/g, (_, n) => SUB[n] ?? '0');
  url = 'https://xiumi.us' + url;
  const qs = new URLSearchParams();
  for (const q of ep.query || []) {
    if (/^(limit|offset|page|per_page)$/.test(q)) qs.set(q, q === 'limit' || q === 'per_page' ? '5' : '0');
    else if (q === 'show_type') qs.set(q, 'paper');
    else if (/^(state|type|mode|sort|filter)$/.test(q)) qs.set(q, '');
  }
  const full = qs.toString() ? `${url}?${qs}` : url;

  let rec = { path: ep.path, method: 'GET', url: full };
  try {
    const r = await ctx.get(full, { timeout: 20000, maxRedirects: 0 });
    rec.status = r.status();
    const txt = await r.text();
    rec.size = txt.length;
    try {
      const j = JSON.parse(txt);
      rec.envelope = { code: j.code, message: j.message };
      rec.dataKeys = j.data && typeof j.data === 'object'
        ? (Array.isArray(j.data) ? `[array ${j.data.length}]` : Object.keys(j.data).slice(0, 40))
        : typeof j.data;
      rec.sample = JSON.stringify(j).slice(0, 1200);
    } catch {
      rec.sample = txt.slice(0, 300);
    }
  } catch (e) {
    rec.error = String(e.message).slice(0, 200);
  }
  results.push(rec);
  const mark = rec.error ? 'ERR' : String(rec.status);
  console.log(`${mark.padEnd(5)} ${full.slice(0, 110)}`);
}

fs.writeFileSync(path.join(OUT, 'probe_results.json'), JSON.stringify({
  probedAt: new Date().toISOString(),
  user: meUser ? { user_sid: meUser.user_sid, nickname: meUser.nickname, level: meUser.level } : null,
  note: '仅发送 GET 请求，用于验证接口可用性与响应结构；写接口一律未探测。',
  results,
}, null, 2));

const ok = results.filter((r) => r.status && r.status < 300).length;
const denied = results.filter((r) => r.status === 401 || r.status === 403).length;
const nf = results.filter((r) => r.status === 404).length;
console.log(`\n探测 ${results.length} 条：2xx ${ok} / 401-403 ${denied} / 404 ${nf} / 跳过 ${results.filter((r) => r.skipped).length}`);
await ctx.dispose();
