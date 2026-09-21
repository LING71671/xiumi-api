// probe_settings2.mjs — 第二轮探针：上一轮把路径/body 修正后，再逐个实发一次确认。
// 仍然只碰本账号自己的偏好设置，写完立即回读并（能还原的都）还原。
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Xiumi } from '../../client/xiumi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const api = await Xiumi.loadSession(path.join(ROOT, 'capture', 'client-session.json'));
const log = (...a) => console.log(...a);
const j = (v) => JSON.stringify(v).slice(0, 260);

async function show(label, p) {
  try { const v = await p; log(`OK   ${label}  ${j(v)}`); return { ok: true, v }; }
  catch (e) { log(`ERR  ${label}  ${e.message}${e.status ? ' HTTP' + e.status : ''}${e.code !== undefined ? ' code=' + e.code : ''}`); return { ok: false, e }; }
}

const s0 = await api.userSetting().catch(() => ({}));
log(`当前 userSetting = ${j(s0)}`);

log('\n=== updateUserSetting：整表原样回写 ===');
await show('updateUserSetting(settings=s0)', api.updateUserSetting(s0 ?? {}));
await show('回读', api.userSetting());

log('\n=== setShowReceiveType：body 形态 ===');
for (const v of [0, 1]) await show(`setShowReceiveType(${v})`, api.setShowReceiveType(v));
await show('回读 userSetting', api.userSetting());

log('\n=== setBackground：body 形态 ===');
await show("setBackground(undefined)", api.setBackground(undefined));
await show("setBackground('clear')", api.setBackground('clear'));
await show('回读 userSetting', api.userSetting());

log('\n=== setWatermark：body 形态逐个试 ===');
const w0 = await api.watermark().catch(() => null);
log(`当前 watermark = ${j(w0)}`);
await show('setWatermark([])', api.setWatermark([]));
await show('setWatermark(null)', api.setWatermark(null));
await show("setWatermark('')", api.setWatermark(''));
await show('回读 watermark', api.watermark());

log('\n=== setPalette：body 形态 ===');
const p0 = await api.palette().catch(() => null);
log(`当前 palette = ${j(p0)}`);
await show('setPalette([])', api.setPalette([]));
await show('回读 palette', api.palette());

log('\n=== 确认 setMuteLegacy 已移除（旧路径实测 404） ===');
log(`客户端还有 setMuteLegacy 吗：${'setMuteLegacy' in Object.getPrototypeOf(api)}`);

log('\n=== 图库标签：改用修正后的 素材级 接口 ===');
const TAG = `probe2_${Date.now() % 100000}`;
// 1x1 透明 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const up = await show('uploadImageBase64', api.uploadImageBase64(PNG, `${TAG}.png`));
log(`     target_uri=${up.v?.target_uri}`);
const assetId = up.v?.asset_id;
log(`     asset_id=${assetId}`);
if (assetId) {
  await show('getImageTags(asset_id) 写前', api.getImageTags(assetId));
  await show('addImageTag(asset_id, tag)', api.addImageTag(assetId, TAG));
  await show('getImageTags(asset_id) 写后', api.getImageTags(assetId));
  await show('账户级 imageTags()', api.imageTags());
  await show('imageTagDetails()', api.imageTagDetails());
  await show('renameImageTag', api.renameImageTag(TAG, `${TAG}_r`));
  await show('账户级 imageTags() 改名后', api.imageTags());
  await show('deleteImageTag(tag)', api.deleteImageTag(`${TAG}_r`));
  await show('账户级 imageTags() 删除后', api.imageTags());
  await show('removeImageTag', api.removeImageTag(assetId, TAG));
  await show('deleteAsset 清理', api.deleteAsset(assetId));
  await show('listImages 确认清理', api.listImages({ limit: 3 }));
}

log('\n完成');
