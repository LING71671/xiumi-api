// probe_settings4.mjs — 第四轮：找回第二轮上传留下的素材并删掉；palette 换成表单编码再试。
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Xiumi } from '../../client/xiumi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const api = await Xiumi.loadSession(path.join(ROOT, 'capture', 'client-session.json'));
const log = (...a) => console.log(...a);
const j = (v) => JSON.stringify(v).slice(0, 500);

async function show(label, p) {
  try { const v = await p; log(`OK   ${label}  ${j(v)}`); return { ok: true, v }; }
  catch (e) { log(`ERR  ${label}  ${e.message}${e.status ? ' HTTP' + e.status : ''}${e.code !== undefined ? ' code=' + e.code : ''}`); return { ok: false, e }; }
}

log('=== 找素材：几种列表入口 ===');
await show('listImages({limit:20})', api.listImages({ limit: 20 }));
await show('imagesCount()', api.imagesCount());
await show('usedImagesCount()', api.usedImagesCount());
await show('imageUntags()', api.imageUntags());
await show('raw GET /api/assets/list/image?limit=20', api.request('GET', '/api/assets/list/image', { query: { limit: 20 } }));
await show('raw GET /api/assets?limit=20', api.request('GET', '/api/assets', { query: { limit: 20 } }));

log('\n=== palette：换 content-type（表单编码）再试 ===');
const enc = encodeURIComponent('[]');
for (const t of ['text/plain', 'application/x-www-form-urlencoded']) {
  await show(`POST palette as ${t}`, api.request('POST', '/api/user_setting/palette', {
    body: `palette=${encodeURIComponent(enc)}`,
    headers: { 'Content-Type': t },
  }));
}
await show('POST palette {palette:"%5B%5D",team_id:null,user_id:28745337}',
  api.request('POST', '/api/user_setting/palette', { body: { palette: enc, team_id: null, user_id: null } }));

log('\n=== user_setting 其它可能路径 ===');
for (const p of ['/api/user_settings', '/api/user_setting/sync', '/api/user_setting/settings']) {
  await show(`POST ${p}`, api.request('POST', p, { body: { settings: {} } }));
}

log('\n完成');
