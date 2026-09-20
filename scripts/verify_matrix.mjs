/**
 * verify_matrix.mjs — 写接口的「可逆」端到端验证矩阵
 *
 * 原则：只用自己新建的一次性作品做写操作；每一步都验证 + 还原；
 *       最后把一次性作品删掉，并确认删除生效。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Xiumi } from '../client/xiumi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SESSION = path.join(ROOT, 'capture', 'client-session.json');
const OUT = path.join(ROOT, 'data', 'verified.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const results = [];
async function probe(name, method, pathStr, group, expect, fn) {
  const t0 = Date.now();
  try {
    const r = await fn();
    results.push({ group, name, method, path: pathStr, ok: true, ms: Date.now() - t0, expect, sample: sample(r) });
    log(`  PASS ${group.padEnd(10)} ${name}`);
    return { ok: true, r };
  } catch (e) {
    results.push({ group, name, method, path: pathStr, ok: false, ms: Date.now() - t0, expect, error: String(e.message), code: e.code, status: e.status });
    log(`  FAIL ${group.padEnd(10)} ${name}  ${e.message}${e.status ? ' HTTP' + e.status : ''}${e.code ? ' code=' + e.code : ''}`);
    return { ok: false, e };
  }
}
function sample(v) {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return `[Array ${v.length}]`;
  if (typeof v === 'object') { const k = Object.keys(v); return `{${k.slice(0, 10).join(',')}${k.length > 10 ? ',…' : ''}}`; }
  return typeof v === 'string' ? v.slice(0, 80) : v;
}

(async () => {
  const api = await Xiumi.loadSession(SESSION);
  const me = await api._me();
  log(`账号 ${me.nickname} uid=${me.unique_uid}\n`);

  // ---------- 只读 ----------
  log('[只读]');
  await probe('me', 'GET', '/auth/me', 'auth', 'user 对象', () => api.me());
  await probe('userInfo', 'GET', '/api/user/info', 'auth', 'user 对象', () => api.userInfo());
  await probe('sysInfo', 'GET', '/api/sys_info', 'auth', '配置项', () => api.sysInfo());
  await probe('apikey', 'GET', '/api/apikey', 'auth', 'api key', () => api.apiKey());
  await probe('walletBalance', 'GET', '/api/wallet/my/balance', 'wallet', '余额', () => api.walletBalance());
  await probe('bills', 'GET', '/api/wallet/bills', 'wallet', '账单', () => api.bills({ limit: 5 }));
  await probe('listShows', 'GET', '/api/shows', 'show', '作品数组', () => api.listShows({ type: 'paper', limit: 3 }));
  await probe('showsCount', 'GET', '/api/shows/count', 'show', '计数', () => api.showsCount('paper'));
  await probe('listImages', 'GET', '/api/assets/list/image', 'asset', '图片数组', () => api.listImages({ limit: 3 }));
  await probe('listTemplates', 'GET', '/api/templates', 'template', '模板数组', () => api.listTemplates());
  await probe('fragmentTagDetails', 'GET', '/api/fragments/v5/paper/comp/tags', 'template', '标签+碎片', () => api.fragmentTagDetails());
  await probe('fragmentTagsOrder', 'GET', '/api/fragments/v5/paper/comp/tagsorder', 'template', '标签排序', () => api.fragmentTagsOrder());
  await probe('usedFragmentsCount', 'GET', '/api/fragments/used/paper_cp', 'template', '额度', () => api.usedFragmentsCount('paper_cp'));
  await probe('teams', 'GET', '/api/teams', 'team', '团队数组', () => api.teams());
  await probe('messages', 'GET', '/api/messages', 'msg', '消息数组', () => api.messages({ limit: 3 }));
  await probe('orders', 'GET', '/api/orders', 'order', '订单数组', () => api.orders({ limit: 3 }));

  // ---------- 标签（可逆） ----------
  log('\n[标签 - 可逆写]');
  await probe('listTags', 'GET', '/api/shows/all/tags', 'tag', '标签列表', () => api.listTags('all'));
  const TAG = `apiverify_${Date.now() % 100000}`;
  let tagAdded = false;

  // ---------- 写：新建一次性作品 ----------
  log('\n[作品写链路]');
  const TITLE = `API 验证用作品 ${new Date().toISOString().slice(0, 19)}`;
  const created = await probe('createBlankShow', 'POST', '/api/shows/v5/paper', 'show-w', '返回 show_id', () =>
    api.createBlankShow('paper', TITLE));
  const sid = created.r?.show_id;
  log(`        -> show_id=${sid}`);
  if (!sid) { log('无法创建作品，终止写测试'); finish(); return; }

  const meta0 = await probe('getShow', 'GET', `/api/shows/${sid}`, 'show-r', '元信息', () => api.getShow(sid));
  log(`        -> title="${meta0.r?.title}" saved_at=${meta0.r?.saved_at} data_url=${meta0.r?.show_data_url}`);

  const rd = await probe('readShowData(published)', 'GET', 'show_data_url', 'show-r', '作品 JSON', () => api.readShowData(meta0.r));
  log(`        -> keys=${rd.r?.data && typeof rd.r.data === 'object' ? Object.keys(rd.r.data).length : '-'}`);
  const ed = await probe('readShowData(editing)', 'GET', 'editing_show_data_url', 'show-r', '草稿 JSON', () => api.readShowData(meta0.r, { editing: true }));
  log(`        -> keys=${ed.r?.data && typeof ed.r.data === 'object' ? Object.keys(ed.r.data).length : '-'}`);

  const base = (ed.r?.data && typeof ed.r.data === 'object') ? ed.r.data : rd.r?.data;
  if (!base) { log('拿不到作品内容，终止'); finish(); return; }

  const m1 = await api.getShow(sid);
  await probe('updateShow(PUT) 改标题', 'PUT', `/api/shows/${sid}`, 'show-w', 'code=2 Updated', () => {
    const d = JSON.parse(JSON.stringify(base));
    d.title = `${TITLE} (已改)`;
    return api.updateShow(m1, d);
  });
  await sleep(800);
  const m2 = await api.getShow(sid);
  const okTitle = String(m2.title).includes('(已改)');
  log(`        -> 回读 title="${m2.title}"  改标题生效=${okTitle}`);
  results.push({ group: 'show-w', name: '改标题回读一致', method: 'GET', path: `/api/shows/${sid}`, ok: okTitle, expect: 'title 含 (已改)' });

  await sleep(400);
  await probe('addTag', 'POST', `/api/shows/${sid}/tags`, 'tag', '写入标签', () => api.addTag(sid, TAG));
  tagAdded = true;
  await sleep(300);
  const tagsNow = await api.listTags('all').catch(() => null);
  const tagVisible = JSON.stringify(tagsNow || '').includes(TAG);
  log(`        -> 标签可见=${tagVisible}`);
  results.push({ group: 'tag', name: '标签写入后可见', method: 'GET', path: '/api/shows/all/tags', ok: tagVisible, expect: `包含 ${TAG}` });

  await probe('renameTag', 'POST', '/api/shows/tags/rename', 'tag', '重命名标签', () => api.renameTag(TAG, TAG + '_r'));
  await probe('removeTag(DELETE)', 'DELETE', `/api/shows/${sid}/tags/{tag}`, 'tag', '移除标签', () => api.removeTag(sid, TAG + '_r'));
  await probe('clearTag(DELETE)', 'DELETE', '/api/shows/tags/clear/{tag}', 'tag', '清空标签', () => api.clearTag(TAG + '_r'));

  // ---------- 作品开关（可逆） ----------
  log('\n[作品开关 - 可逆]');
  await probe('setRightAccessPrivilege', 'PUT', `/api/shows/${sid}/right_access_privilege/{v}`, 'show-w', '权限位', () => api.setRightAccessPrivilege(sid, 0));
  await probe('setWechatNoShare(0)', 'PUT', `/api/shows/${sid}/wechat_no_share/0`, 'show-w', '关分享屏蔽', () => api.setWechatNoShare(sid, 0));
  await probe('setTrafficPackageUsage(0)', 'PUT', `/api/shows/${sid}/use_traffic_package/0`, 'show-w-na', '无流量包时报 Failed_NotFound', () => api.setTrafficPackageUsage(sid, 0).catch((e) => {
    if (/package provider missing/.test(String(e.message))) return { _na: '账号无流量包' };
    throw e;
  }));
  await probe('trafficPackageUsage', 'GET', `/api/shows/${sid}/consumed/traffic_package/info`, 'show-r', '流量信息', () => api.trafficPackageUsage(sid));
  await probe('showHistories', 'GET', `/api/shows/${sid}/histories`, 'show-r', '历史版本', () => api.showHistories(sid));
  await probe('previewUri', 'GET', '/preview/uri', 'show-r', '预览链接', () => api.previewUri(`/shows/${sid}`));

  // ---------- 拷贝（可逆：拷给自己另一个副本再删） ----------
  log('\n[拷贝]');
  const cp = await probe('copyShow', 'POST', `/api/shows/v5/paper?from_show_id=${sid}`, 'show-w', '新副本', () =>
    api.copyShow(m2, null));
  const cpId = cp.r?.show_id;
  log(`        -> 副本 show_id=${cpId}`);

  // ---------- 清理 ----------
  log('\n[清理 - 删除一次性作品]');
  await probe('deleteShow(原)', 'DELETE', `/api/shows/${sid}`, 'show-w', 'code=3 Deleted', () => api.deleteShow(sid));
  if (cpId) await probe('deleteShow(副本)', 'DELETE', `/api/shows/${cpId}`, 'show-w', 'code=3 Deleted', () => api.deleteShow(cpId));
  await sleep(800);
  const del = await probe('deletedShows', 'GET', '/api/shows/deleted/shows', 'show-r', '回收站含被删作品', () => api.deletedShows({ limit: 100 }));
  const hit = (del.r || []).find((s) => Number(s.orig_show_id) === Number(sid));
  log(`        -> 回收站可见被删作品=${!!hit}${hit ? ` deleted_show_id=${hit.deleted_show_id}` : ''}`);
  results.push({ group: 'show-w', name: '删除进入回收站', method: 'GET', path: '/api/shows/deleted/shows', ok: !!hit, expect: '含已删 orig_show_id' });

  const rs = await probe('recoverShow', 'POST', `/api/shows/recover/{deleted_show_id}`, 'show-w', '返回 Recovered', () =>
    api.recoverShow(hit ? hit.deleted_show_id : sid));
  await sleep(700);
  const back = await api.getShow(sid).then(() => true).catch(() => false);
  log(`        -> 恢复后可见=${back}`);
  results.push({ group: 'show-w', name: '恢复后元信息可读', method: 'GET', path: `/api/shows/${sid}`, ok: back, expect: '可读' });
  if (back) await probe('deleteShow(二次清理)', 'DELETE', `/api/shows/${sid}`, 'show-w', '再次删除', () => api.deleteShow(sid));
  else log('        (未恢复成功，跳过二次删除)');

  finish();
})().catch((e) => { console.error(e); finish(); });

function finish() {
  const groups = {};
  for (const r of results) {
    groups[r.group] ||= { pass: 0, fail: 0 };
    r.ok ? groups[r.group].pass++ : groups[r.group].fail++;
  }
  const summary = { at: new Date().toISOString(), total: results.length, pass: results.filter((r) => r.ok).length, groups };
  fs.writeFileSync(OUT, JSON.stringify({ summary, results }, null, 2));
  log(`\n===== 汇总 =====`);
  log(`总计 ${summary.total}  通过 ${summary.pass}  失败 ${summary.total - summary.pass}`);
  for (const [g, v] of Object.entries(groups)) log(`  ${g.padEnd(10)} pass=${v.pass} fail=${v.fail}`);
  log(`报告 -> ${OUT}`);
}
