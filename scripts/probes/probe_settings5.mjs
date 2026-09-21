// probe_settings5.mjs — 第五轮：把上一轮失败的几处收敛掉（顺序参数是字符串？片段标签要 category？外链要什么样的 URL？）
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Xiumi } from '../../client/xiumi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const api = await Xiumi.loadSession(path.join(ROOT, 'capture', 'client-session.json'));
const log = (...a) => console.log(...a);
const j = (v) => JSON.stringify(v).slice(0, 320);

async function show(label, p) {
  try { const v = await p; log(`OK   ${label}  ${j(v)}`); return { ok: true, v }; }
  catch (e) { log(`ERR  ${label}  ${e.message}${e.status ? ' HTTP' + e.status : ''}`); return { ok: false, e }; }
}

const me = await api.me();
log('me 的键:', Object.keys(me).join(','));
log(`user_sid=${me.user_sid}  unique_uid=${me.unique_uid}  uid=${me.uid}\n`);

log('=== setTagsOrder：order 是不是字符串？ ===');
for (const o of ['', '[]', encodeURIComponent('[]'), 'a,b']) {
  await show(`setTagsOrder(${JSON.stringify(o)})`, api.request('POST', '/api/shows/tags/order', { body: { order: o } }));
}

log('\n=== setImageTagsOrder：同上 ===');
for (const o of ['', '[]']) {
  await show(`setImageTagsOrder(${JSON.stringify(o)})`, api.request('POST', '/api/assets/type/image/tagsorder', { body: { order: o } }));
}

log('\n=== addFragmentTag：补 category 段 ===');
for (const p of ['/api/fragments/v5/paper/comp/tags', '/api/fragments/v5/paper/tags', '/api/fragments/v5/paper/comp/tag']) {
  await show(`POST ${p} {tag}`, api.request('POST', p, { body: { tag: encodeURIComponent('probe_frag') } }));
}
await show('回读 fragmentTagDetails', api.fragmentTagDetails());

log('\n=== addImageOutlink：换 URL 形态 ===');
for (const u of [
  'https://statics.xiumi.us/stc/images/placeholder-img.jpg',
  '//statics.xiumi.us/stc/images/placeholder-img.jpg',
  'https://img.xiumi.us/xmi/ua/5NATE/i/placeholder.jpg',
  'https://www.baidu.com/img/flexible/logo/pc/result.png',
]) {
  await show(`addImageOutlink(${u.slice(0, 46)})`, api.addImageOutlink(u));
}
await show('回读 listImages', api.listImages({ limit: 5 }));
await show('回读 imagesCount', api.imagesCount());

log('\n=== 主页标签：uid 该给 unique_uid 还是 user_sid？ ===');
for (const u of [me.unique_uid, me.user_sid, me.uid]) {
  if (u === undefined || u === null) continue;
  await show(`homeTags(${JSON.stringify(String(u))})`, api.homeTags(u, 'all'));
}

log('\n=== sendShow：原样看响应 ===');
const c = await api.createBlankShow('paper', 'probe5 sendShow');
log(`   scratch show_id=${c?.show_id}`);
await show('sendShow(toSelfAccount)', api.sendShow(c.show_id, { toSelfAccount: true }));
await show('sendShow(toUserAccount=自己)', api.sendShow(c.show_id, { toUserAccount: me.user_sid }));
await show('deleteShow 清理', api.deleteShow(c.show_id));

log('\n=== renameShow：确认 PUT /api/shows/{id} 只给 title 会被拒 ===');
const c2 = await api.createBlankShow('paper', 'probe5 renameShow');
log(`   scratch show_id=${c2?.show_id}`);
await show('renameShow(title only)', api.renameShow(c2.show_id, 'probe5 改名'));
await show('deleteShow 清理', api.deleteShow(c2.show_id));

log('\n完成');
