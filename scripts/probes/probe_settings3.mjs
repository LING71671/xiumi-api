// probe_settings3.mjs — 第三轮：收敛剩下的 body 形状问题，并把第二轮留下的痕迹清掉。
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Xiumi } from '../../client/xiumi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const api = await Xiumi.loadSession(path.join(ROOT, 'capture', 'client-session.json'));
const log = (...a) => console.log(...a);
const j = (v) => JSON.stringify(v).slice(0, 400);

async function show(label, p) {
  try { const v = await p; log(`OK   ${label}  ${j(v)}`); return { ok: true, v }; }
  catch (e) { log(`ERR  ${label}  ${e.message}${e.status ? ' HTTP' + e.status : ''}${e.code !== undefined ? ' code=' + e.code : ''}`); return { ok: false, e }; }
}

log('=== listImages 结构（要拿 asset_id） ===');
const imgs = await show('listImages', api.listImages({ limit: 3 }));
if (Array.isArray(imgs.v) && imgs.v[0]) {
  log('     第一张的键:', Object.keys(imgs.v[0]).join(','));
  log('     sample:', j(imgs.v[0]));
}

log('\n=== user_setting 写入路径变体 ===');
await show('POST /api/user_setting  body {settings:{}}', api.request('POST', '/api/user_setting', { body: { settings: {} } }));
await show('POST /api/user_setting/ body {settings:{}}', api.request('POST', '/api/user_setting/', { body: { settings: {} } }));
await show('POST /api/user_setting  body {}', api.request('POST', '/api/user_setting', { body: {} }));
await show('PUT  /api/user_setting  body {settings:{}}', api.request('PUT', '/api/user_setting', { body: { settings: {} } }));

log('\n=== setPalette body 键名变体（逐个试） ===');
const variants = [
  ['palette=encoded []', { palette: encodeURIComponent('[]') }],
  ['palette="[]"', { palette: '[]' }],
  ['colorGroups=[]', { colorGroups: [] }],
  ['color_groups=[]', { color_groups: [] }],
  ['paletteGroups=[]', { paletteGroups: [] }],
  ['groups=[]', { groups: [] }],
];
for (const [label, body] of variants) {
  await show(`POST /api/user_setting/palette ${label}`, api.request('POST', '/api/user_setting/palette', { body }));
}

log('\n=== 还原：把第二轮写进去的 background 抹掉 ===');
await show('setBackground(null)', api.setBackground(null));
await show('setBackground("none")', api.setBackground('none'));
await show('回读 userSetting', api.userSetting());

log('\n=== show-receive-type 的合法取值 ===');
for (const v of ['all', 'none', 'team', 'share']) {
  await show(`setShowReceiveType(${JSON.stringify(v)})`, api.setShowReceiveType(v));
}
await show('回读 userSetting', api.userSetting());

log('\n=== watermark 写入尝试（用数组形态） ===');
await show('POST watermark {watermarks:[]}', api.request('POST', '/api/user_setting/watermark', { body: { watermarks: [] } }));
await show('POST watermark {watermarks:"",team_id:null}', api.request('POST', '/api/user_setting/watermark', { body: { watermarks: '', team_id: null } }));
await show('回读 watermark', api.watermark());

log('\n完成');
