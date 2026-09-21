// probe_settings.mjs — 一次性探针：把「body 形状未知」的设置类写接口逐个实发一次，看服务端怎么回。
// 目的只是**取证**（拿到 body 形状与响应结构），不作结论。结论由 verify_ops.mjs 产出。
//
// 安全约束：全部是**本账号自己的偏好设置**，且写入值取「当前值原样回写」（零差异）。
//          唯一的例外是 setShowReceiveType 走路径段、无法原样回写，探测后立即读回并记录。
//
// 用法：node scripts/probes/probe_settings.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Xiumi } from '../../client/xiumi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SESSION = path.join(ROOT, 'capture', 'client-session.json');

const api = await Xiumi.loadSession(SESSION);
const log = (...a) => console.log(...a);
const j = (v) => JSON.stringify(v);

async function show(label, p) {
  try {
    const v = await p;
    log(`OK   ${label}  ${j(v).slice(0, 300)}`);
    return { ok: true, v };
  } catch (e) {
    log(`ERR  ${label}  ${e.message}${e.status ? ' HTTP' + e.status : ''}${e.code !== undefined ? ' code=' + e.code : ''}`);
    return { ok: false, e };
  }
}

log('=== 写入前 ===');
const s0 = (await show('userSetting', api.userSetting())).v;
await show('watermark', api.watermark());
const p0 = (await show('palette', api.palette())).v;
const m0 = (await show('messageSettings', api.messageSettings())).v;
await show('imageTags', api.imageTags());
await show('imageTagsOrder', api.imageTagsOrder());

log('\n=== 零差异写：user_setting 原样回写 ===');
await show('POST /api/user_setting (当前值)', api.updateUserSetting(s0 ?? {}));
await show('回读 userSetting', api.userSetting());

log('\n=== show-receive-type：路径段，逐个试 ===');
for (const v of [0, 1]) {
  await show(`POST /api/user_setting/show-receive-type/${v}`, api.setShowReceiveType(v));
  await show('回读 userSetting', api.userSetting());
}

log('\n=== watermark 原样回写 ===');
const w0 = await api.watermark().catch(() => null);
await show('POST /api/user_setting/watermark (当前值)', api.setWatermark(w0 ?? {}));
await show('回读 watermark', api.watermark());

log('\n=== palette 原样回写 ===');
await show('POST /api/user_setting/palette (当前值)', api.setPalette({ palette: p0 ?? [] }));
await show('回读 palette', api.palette());

log('\n=== background 原样回写 ===');
await show('POST /api/user_setting/background (空 body)', api.setBackground({}));
await show('回读 userSetting', api.userSetting());

log('\n=== 静音开关：切换 → 回读 → 还原 ===');
const kinds = ['mute_new_show', 'mute_invitation', 'mute_be_saved_to'];
const cur = m0 || (await api.messageSettings());
for (const kind of kinds) {
  const before = Number(cur?.[kind] ?? 0);
  const target = before ? 0 : 1;
  await show(`setMute(${kind}, ${target})`, api.setMute(kind, target));
  const now = await api.messageSettings().catch(() => null);
  log(`     ${kind}: ${before} -> ${target} 回读=${j(now?.[kind])}`);
  await show(`setMute(${kind}, ${before}) 还原`, api.setMute(kind, before));
  const back = await api.messageSettings().catch(() => null);
  log(`     还原回读=${j(back?.[kind])}`);
}

log('\n=== setMuteLegacy 同路径，试一次 ===');
await show('setMuteLegacy(mute_new_show, 0)', api.setMuteLegacy('mute_new_show', 0));
await show('回读 messageSettings', api.messageSettings());

log('\n=== htmlCode 校验（纯校验，无状态） ===');
await show('verifyHtmlCode', api.verifyHtmlCode({ html: '<p>probe</p>' }));

log('\n=== 图片标签：建 → 列 → 改 → 删 ===');
const TAG = `probe_${Date.now() % 100000}`;
await show('addImageTag({tag})', api.addImageTag({ tag: TAG }));
await show('回读 imageTags', api.imageTags());
await show('renameImageTag', api.renameImageTag({ old_tag: TAG, new_tag: TAG + '_r' }));
await show('回读 imageTags', api.imageTags());
await show('deleteImageTag(tag)（客户端现状：漏路径段）', api.deleteImageTag(TAG));
await show('回读 imageTags', api.imageTags());
// 残余清理：直接用 raw 打正确路径试一次
await show('raw DELETE /api/assets/type/image/tag/<tag>', api.request('DELETE', `/api/assets/type/image/tag/${encodeURIComponent(TAG + '_r')}`));
await show('回读 imageTags（清理后）', api.imageTags());

log('\n完成');
