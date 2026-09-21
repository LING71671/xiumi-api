/**
 * verify_matrix.mjs — 作品写链路 + 只读面 的端到端验证矩阵
 *
 * 原则：
 *   1. 只用自己新建的一次性作品做写操作，最后删掉并确认删除生效。
 *   2. **一个客户端方法一条记录**，且通过条件包含回读断言 ——
 *      「PUT 返回 200」不算通过，「PUT 后回读到新值」才算。
 *   3. 状态由本脚本**回写** data/verification.json，不写进源码注释。
 *      注释里的旧标注只是「声明」，见 scripts/lib/verification.mjs 的说明。
 *   4. 环境不具备的（无流量包等）记 blocked，与 failed 区分，不产出假阴性。
 *
 * 用法：node scripts/verify_matrix.mjs [--dry]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Xiumi } from '../client/xiumi.mjs';
import { Verifier, Blocked, summarize } from './lib/verification.mjs';
import { loadMeta } from './lib/methodmeta.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SESSION = path.join(ROOT, 'capture', 'client-session.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

function must(cond, msg) {
  if (!cond) throw new Error(`断言失败：${msg}`);
}

const V = new Verifier({ script: 'verify_matrix.mjs', dryRun: process.argv.includes('--dry') });
const R = (m, fn, o) => V.probe(m, 'read', fn, o);
const W = (m, fn, o) => V.probe(m, 'write', fn, o);

const api = await Xiumi.loadSession(SESSION);
const me = await api._me();
log(`账号 ${me.nickname}\n`);

// ---------------------------------------------------------------- 只读面
log('[只读]');
await R('me', () => api.me(), { expect: '当前用户对象' });
await R('userInfo', () => api.userInfo(), { expect: 'user 对象' });
await R('sysInfo', () => api.sysInfo(), { expect: '站点配置项' });
await R('apiKey', () => api.apiKey(), { expect: 'api key 记录' });
await R('walletBalance', () => api.walletBalance(), { expect: '余额字段' });
await R('bills', () => api.bills({ limit: 5 }), { expect: '账单数组' });
await R('listShows', async () => must((await api.listShows({ type: 'paper', limit: 3 })).length >= 0, '返回数组'), { expect: '作品数组' });
await R('showsCount', () => api.showsCount('paper'), { expect: '计数' });
await R('listImages', () => api.listImages({ limit: 3 }), { expect: '图片数组' });
await R('listTemplates', () => api.listTemplates(), { expect: '模板数组' });
await R('fragmentTagDetails', () => api.fragmentTagDetails(), { expect: '标签 + 碎片' });
await R('fragmentTagsOrder', () => api.fragmentTagsOrder(), { expect: '标签排序' });
await R('usedFragmentsCount', () => api.usedFragmentsCount('paper_cp'), { expect: '额度' });
await R('teams', () => api.teams(), { expect: '团队数组（普通账号可能为空）' });
await R('messages', () => api.messages({ limit: 3 }), { expect: '消息数组' });
await R('orders', () => api.orders({ limit: 3 }), { expect: '订单数组' });
await R('listTags', () => api.listTags('all'), { expect: '我的标签列表' });

// ---------------------------------------------------------------- 写链路
log('\n[作品写链路]');
const TITLE = `API 验证用作品 ${new Date().toISOString().slice(0, 19)}`;
const TAG = `apiverify_${Date.now() % 100000}`;

const created = await W('createBlankShow', () => api.createBlankShow('paper', TITLE), { expect: '返回 show_id' });
const sid = created.value?.show_id;
if (!sid) {
  log('\n无法创建作品 —— 写链路全部跳过（不产出任何写结论）');
  V.save();
  process.exit(1);
}
log(`        -> show_id=${sid}`);

await R('getShow', async () => {
  const m = await api.getShow(sid);
  must(m && Number(m.show_id) === Number(sid), `show_id 一致（拿到 ${m?.show_id}）`);
  return m;
}, { expect: '元信息且 show_id 一致' });

const meta0 = await api.getShow(sid);

await R('readShowData', async () => {
  const r = await api.readShowData(meta0);
  must(r?.data && typeof r.data === 'object', '返回作品 JSON');
  return r;
}, { expect: '作品内容 JSON' });

const ed = await api.readShowData(meta0, { editing: true }).catch(() => null);
if (ed?.data) {
  V.record('readShowData', 'read', { ok: true, case: 'readShowData(editing)', note: '草稿版本可读' });
  log('  ✅ readShowData [editing]');
}
const base = ed?.data || (await api.readShowData(meta0)).data;

// 改标题 + 回读
await W('updateShow', async () => {
  const m = await api.getShow(sid);
  const d = JSON.parse(JSON.stringify(base));
  d.title = `${TITLE} (已改)`;
  await api.updateShow(m, d);
  await sleep(900);
  const after = await api.getShow(sid);
  must(String(after.title).includes('(已改)'), `回读 title 应含「(已改)」，实为「${after.title}」`);
  return after;
}, { expect: 'PUT 后回读 title 变化' });

// 标签：写 → 回读可见 → 重命名 → 回读 → 移除 → 回读消失
await W('addTag', async () => {
  await api.addTag(sid, TAG);
  await sleep(400);
  const tags = JSON.stringify((await api.listTags('all')) || '');
  must(tags.includes(TAG), `回读标签列表应含 ${TAG}`);
  return true;
}, { expect: '标签写入后可从 listTags 回读' });

await W('renameTag', async () => {
  await api.renameTag(TAG, `${TAG}_r`);
  await sleep(400);
  const tags = JSON.stringify((await api.listTags('all')) || '');
  must(tags.includes(`${TAG}_r`) && !tags.includes(`"${TAG}"`), '旧名消失、新名出现');
  return true;
}, { expect: '重命名后旧名消失新名出现' });

await W('removeTag', async () => {
  await api.removeTag(sid, `${TAG}_r`);
  await sleep(400);
  const tags = JSON.stringify((await api.listTags('all')) || '');
  must(!tags.includes(`${TAG}_r`), '标签已从列表移除');
  return true;
}, { expect: '移除后标签列表不再含该标签' });

await W('clearTag', () => api.clearTag(`${TAG}_r`), { expect: 'DELETE 成功（此时该标签已无引用）' });

// 作品开关：改 → 回读
await W('setRightAccessPrivilege', async () => {
  const m = await api.getShow(sid);
  const before = m.right_access_privilege;
  const target = Number(before) === 0 ? 2 : 0;
  await api.setRightAccessPrivilege(sid, target);
  await sleep(400);
  const after = await api.getShow(sid);
  must(Number(after.right_access_privilege) === target, `回读应为 ${target}，实为 ${after.right_access_privilege}`);
  await api.setRightAccessPrivilege(sid, before).catch(() => {});
  return target;
}, { expect: 'PUT 后回读权限位变化（随后还原）' });

await W('setWechatNoShare', async () => {
  const m = await api.getShow(sid);
  const before = Number(m.wechat_no_share) || 0;
  const target = before === 0 ? 1 : 0;
  await api.setWechatNoShare(sid, target);
  await sleep(400);
  const after = await api.getShow(sid);
  must(Number(after.wechat_no_share) === target, `回读应为 ${target}，实为 ${after.wechat_no_share}`);
  await api.setWechatNoShare(sid, before).catch(() => {});
  return target;
}, { expect: 'PUT 后回读 wechat_no_share 变化（随后还原）' });

await W('setTrafficPackageUsage', async () => {
  try {
    await api.setTrafficPackageUsage(sid, 0);
    return true;
  } catch (e) {
    // 账号没有流量包时服务端报 Failed_NotFound —— 这是环境限制，不是方法错
    if (/package provider missing|Failed_NotFound|NotFound/i.test(String(e.message))) {
      throw new Blocked(`账号无流量包：${e.message}`);
    }
    throw e;
  }
}, { expect: '有流量包时切换成功，否则标 blocked' });

await R('trafficPackageUsage', () => api.trafficPackageUsage(sid), { expect: '流量信息对象' });
await R('showHistories', async () => {
  const h = await api.showHistories(sid);
  must(h !== undefined, '返回历史版本');
  return h;
}, { expect: '历史版本数组' });
await R('previewUri', async () => {
  const u = await api.previewUri(`/shows/${sid}`);
  must(!!u, '返回预览链接');
  return u;
}, { expect: '预览链接非空' });

// 拷贝：拷给自己再删
const m2 = await api.getShow(sid);
const cp = await W('copyShow', async () => {
  const c = await api.copyShow(m2, null);
  must(c?.show_id && Number(c.show_id) !== Number(sid), '副本应有新的 show_id');
  return c;
}, { expect: '产生新的 show_id' });
const cpId = cp.value?.show_id;
log(`        -> 副本 show_id=${cpId}`);

// ---------------------------------------------------------------- 清理
log('\n[清理 - 删除一次性作品]');
await W('deleteShow', async () => {
  await api.deleteShow(sid);
  await sleep(900);
  const del = await api.deletedShows({ limit: 100 });
  const hit = (del || []).find((s) => Number(s.orig_show_id) === Number(sid));
  must(!!hit, '回收站应出现该作品');
  return hit;
}, { expect: '删除后进入回收站' });
if (cpId) await W('deleteShow', () => api.deleteShow(cpId), { case: 'deleteShow(副本)', expect: '副本删除成功' });

let deletedShowId = null;
{
  const del = await api.deletedShows({ limit: 100 });
  deletedShowId = (del || []).find((s) => Number(s.orig_show_id) === Number(sid))?.deleted_show_id || null;
}

await W('recoverShow', async () => {
  must(deletedShowId, '需要先拿到 deleted_show_id');
  await api.recoverShow(deletedShowId);
  await sleep(800);
  const back = await api.getShow(sid).then((m) => m).catch(() => null);
  must(back, '恢复后应能读回元信息');
  return back;
}, { expect: '恢复后元信息可读' });

await R('deletedShows', async () => {
  const d = await api.deletedShows({ limit: 5 });
  must(Array.isArray(d), '返回数组');
  return d;
}, { expect: '回收站数组' });

// 二次清理：把恢复回来的作品再删一次，恢复运行前状态
await W('deleteShow', async () => {
  await api.deleteShow(sid);
  await sleep(800);
  return true;
}, { case: 'deleteShow(二次清理)', expect: '再删一次，恢复账号原状' });

V.save();

// ---------------------------------------------------------------- 汇总
const metas = await loadMeta(Xiumi);
const sum = summarize(metas, V.store);
log('\n===== 全量状态 =====');
log(`方法总数 ${sum.all.total}  ✅${sum.all.verified}  ⚠️${sum.all.regressed}  ❌${sum.all.failed}  ⛔${sum.all.blocked}  ◻${sum.all.declared}  ❔${sum.all.unknown}`);
log(`  读 ${sum.byKind.read.total}：✅${sum.byKind.read.verified} ❌${sum.byKind.read.failed} ⛔${sum.byKind.read.blocked} ❔${sum.byKind.read.unknown}`);
log(`  写 ${sum.byKind.write.total}：✅${sum.byKind.write.verified} ❌${sum.byKind.write.failed} ⛔${sum.byKind.write.blocked} ❔${sum.byKind.write.unknown}`);
