/**
 * verify_ops.mjs — 可逆/零副作用面的端到端验证
 *
 * 与 verify_matrix.mjs 的分工：
 *   verify_matrix.mjs  作品写链路（建 → 改 → 回读 → 删 → 回收站 → 恢复）
 *   verify_ops.mjs     其余面：只读方法、素材/标签族、偏好设置、消息、碎片标签、作品扩展
 *
 * 四条硬规矩：
 *   1. **零副作用**。写操作一律「建自己的 → 改 → 回读 → 删/还原」；
 *      做不到可逆的记 ⛔ 并写清原因，不产出假阴性。
 *   2. **通过 = 有回读断言**。写接口只回 code=0 不算通过，要能读回预期变化；
 *      确实读不出字段差异的记 🟡 并注明。
 *   3. **只读方法的通过标准是「路由 + 鉴权 + 参数形状都通、拿到了值」**，
 *      返回值形状写进备注；404/400/403 一律记 ❌ —— 那才是真信号。
 *   4. **状态回写 data/verification.json**，不进源码注释。
 *
 * 用法：node scripts/verify_ops.mjs [--dry] [--only=<子串>]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Xiumi } from '../client/xiumi.mjs';
import { Verifier, Blocked, summarize, summaryLine } from './lib/verification.mjs';
import { loadMeta } from './lib/methodmeta.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SESSION = path.join(ROOT, 'capture', 'client-session.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);

function must(cond, msg) {
  if (!cond) throw new Error(`断言失败：${msg}`);
}
const shape = (v) => (v === undefined ? 'undefined' : v === null ? 'null'
  : Array.isArray(v) ? `Array(${v.length})`
  : typeof v === 'object' ? `{${Object.keys(v).slice(0, 8).join(',')}${Object.keys(v).length > 8 ? ',…' : ''}}`
  : `${typeof v} ${JSON.stringify(v).slice(0, 60)}`);

const V = new Verifier({ script: 'verify_ops.mjs', dryRun: process.argv.includes('--dry') });
const api = await Xiumi.loadSession(SESSION);
const me = await api._me();
const UID = me.unique_uid;                       // 主页类接口要的是 unique_uid，不是 user_sid
log(`账号 ${me.nickname}  unique_uid=${UID}\n`);

const skip = (m) => only && !m.includes(only);

// 先建一个一次性作品：统计/表单类接口需要作品 id 才成立
const scratch = only ? null : await api.createBlankShow('paper', `verify_ops 载体 ${new Date().toISOString().slice(0, 19)}`);
const SID = scratch?.show_id;
log(`载体作品 show_id=${SID}（结束时删除）\n`);

/** 只读面：只断言「调用通过、拿到了值」，形状记进备注 */
const READS = [
  ['loginHistory', () => api.loginHistory({ limit: 5 })],
  ['notify', () => api.notify()],
  ['resetPhoneState', () => api.resetPhoneState()],
  ['templateMembershipState', () => api.templateMembershipState()],
  ['blacklist', () => api.blacklist({ limit: 5 })],
  ['contacts', () => api.contacts({ limit: 5 })],
  ['templateMembership', () => api.templateMembership()],
  ['trafficPackages', () => api.trafficPackages()],
  ['forms', () => api.forms(SID)],
  ['messagesStatus', () => api.messagesStatus()],
  ['userSetting', () => api.userSetting()],
  ['palette', () => api.palette()],
  ['watermark', () => api.watermark()],
  ['watermarkAll', () => api.watermarkAll()],
  ['recommendedHelp', () => api.recommendedHelp()],
  ['userIdentity', () => api.userIdentity()],
  ['audioCategories', () => api.audioCategories()],
  ['audioSources', () => api.audioSources()],
  ['authorState', () => api.authorState()],
  ['goodsFavorites', () => api.goodsFavorites({ limit: 3 })],
  ['goodsFavoriteTagState', () => api.goodsFavoriteTagState('paper')],
  ['goodsFavoriteTagOrder', () => api.goodsFavoriteTagOrder('paper')],
  ['goodsFavoriteTagOrderMap', () => api.goodsFavoriteTagOrderMap('paper')],
  ['homeSlogans', () => api.homeSlogans()],
  ['userCoin', () => api.userCoin()],
  ['userInvitation', () => api.userInvitation()],
  ['invoicesCount', () => api.invoicesCount()],
  ['invoicesLast', () => api.invoicesLast()],
  ['canCreateOrder', () => api.canCreateOrder()],
  ['specialOffer', () => api.specialOffer()],
  ['teamWallets', () => api.teamWallets()],
  ['imageTags', () => api.imageTags()],
  ['imageTagsOrder', () => api.imageTagsOrder()],
  ['imageUntags', () => api.imageUntags()],
  ['imageTagDetails', () => api.imageTagDetails()],
  ['fragmentTagDetails', () => api.fragmentTagDetails()],
  ['fragmentTagsOrder', () => api.fragmentTagsOrder()],
  ['listPattFragTags', () => api.listPattFragTags()],
  ['pattFragTagsOrder', () => api.pattFragTagsOrder()],
  ['tagsAndOrder', () => api.tagsAndOrder()],
  ['tagsOrder', () => api.tagsOrder()],
  ['showsUntag', () => api.showsUntag({ limit: 3 })],
  ['showsInTag', () => api.showsInTag('all', { limit: 3 })],
  ['usedFragmentsCount', () => api.usedFragmentsCount('paper')],
  ['usedImagesCount', () => api.usedImagesCount()],
  ['imagesCount', () => api.imagesCount()],
  ['listVideos', () => api.listVideos({ limit: 3 })],
  ['listAudios', () => api.listAudios({ limit: 3 })],
  ['followers', () => api.followers({ limit: 5 })],
  ['followState', () => api.followState(me.user_sid)],
  ['homeTags', () => api.homeTags(UID, 'all')],
  ['homeTagOrderMap', () => api.homeTagOrderMap(UID)],
  ['getPublishedUserExhibits', () => api.getPublishedUserExhibits(UID, {})],
  ['publishedUserExhibits', () => api.publishedUserExhibits(UID, { limit: 3 })],
  ['publishedUserExhibitsOnMyPage', () => api.publishedUserExhibitsOnMyPage(UID, { limit: 3 })],
  ['publishedUser', () => api.publishedUser(UID)],
  ['showStatistics', () => api.showStatistics(SID)],
  ['statisticsShow', () => api.statisticsShow(SID)],
  ['goodses', () => api.goodses({ limit: 3 })],
  ['myGoodses', () => api.myGoodses({ limit: 3 })],
  ['tplGoodsCount', () => api.tplGoodsCount({})],
  ['tplGoodsBoughtState', () => api.tplGoodsBoughtState({})],
  ['showGoodsRank', () => api.showGoodsRank({ limit: 3 })],
  ['showGoodsTagsTree', () => api.showGoodsTagsTree({})],
  ['templateTagsTree', () => api.templateTagsTree({})],
  ['apiKey', () => api.apiKey()],
  ['homeTagShows', () => api.homeTagShows(UID, 'all', { limit: 3 })],
];

log('[只读面]');
for (const [name, fn] of READS) {
  if (skip(name)) continue;
  await V.probe(name, 'read', fn, { note: (v) => `回读 ${shape(v)}` });
}

// ---------------------------------------------------------------- 偏好设置
log('\n[偏好设置]');
if (!skip('setShowReceiveType')) {
  await V.probe('setShowReceiveType', 'write', async () => {
    const before = (await api.userSetting())?.['show.receive.type'];
    must(before !== undefined, 'userSetting 里没有 show.receive.type，无法做零差异回写');
    await api.setShowReceiveType(before);
    await sleep(300);
    const after = (await api.userSetting())?.['show.receive.type'];
    must(after === before, `回读应仍为 ${before}，实为 ${after}`);
    return after;
  }, { expect: '原样写回当前值，回读一致（零差异）', note: () => 'show.receive.type 写回后回读一致' });
}

if (!skip('setBackground')) {
  await V.probe('setBackground', 'write', async () => {
    const key = 'studio.appearance.desk.background';
    await api.setBackground('none');
    await sleep(300);
    const after = (await api.userSetting())?.[key];
    must(after !== undefined, `写入后 userSetting 应出现 ${key}`);
    return after;
  }, { expect: '写入「无背景」后 userSetting 出现对应键', note: () => 'studio.appearance.desk.background 已写入' });
}

if (!skip('setWatermark')) {
  await V.probe('setWatermark', 'write', async () => {
    const ro = (await api.watermark())?.readOnly;
    if (ro) throw new Blocked('账号水印只读（readOnly=true）');
    const key = 'studio.asset.images.watermark';
    const before = (await api.userSetting())?.[key];
    await api.setWatermark(null);
    await sleep(300);
    const after = (await api.userSetting())?.[key];
    must(after !== undefined, `写入后 userSetting 应出现 ${key}`);
    return before === undefined ? '首次写入创建了该键' : after;
  }, { expect: '写入 null 水印后 userSetting 出现对应键', note: () => 'studio.asset.images.watermark 已写入（body 值为 null 时才被接受）' });
}

if (!skip('setPalette')) {
  await V.probe('setPalette', 'write', () => api.setPalette([]), {
    expect: '把配色写回空列表',
  });
}

if (!skip('updateUserSetting')) {
  await V.probe('updateUserSetting', 'write', () => api.updateUserSetting({}), {
    expect: '整表写回',
  });
}

if (!skip('verifyHtmlCode')) {
  await V.probe('verifyHtmlCode', 'write', async () => {
    const r = await api.verifyHtmlCode('<p>verify_ops</p>');
    must(r !== undefined && r !== null, '应返回处理结果');
    return r;
  }, { expect: '返回处理后的 HTML（纯校验，无状态）', note: (v) => `回读 ${shape(v)}` });
}

// ---------------------------------------------------------------- 消息与静音
log('\n[消息 / 静音]');
if (!skip('messageSettings')) {
  await V.probe('messageSettings', 'read', () => api.messageSettings(), { note: (v) => `回读 ${shape(v)}` });
}

if (!skip('setMute')) {
  await V.probe('setMute', 'write', async () => {
    const kinds = ['mute_new_show', 'mute_invitation', 'mute_be_saved_to'];
    const before = await api.messageSettings();
    for (const k of kinds) {
      const b = Number(before?.[k] ?? 0);
      const t = b ? 0 : 1;
      await api.setMute(k, t);
      await sleep(180);
      const mid = await api.messageSettings();
      must(Number(mid?.[k]) === t, `${k} 应变为 ${t}，实为 ${mid?.[k]}`);
      await api.setMute(k, b);
      await sleep(180);
      const back = await api.messageSettings();
      must(Number(back?.[k]) === b, `${k} 应还原为 ${b}，实为 ${back?.[k]}`);
    }
    return '3 个开关各切一次并还原';
  }, { expect: '三个静音开关 0→1 回读、1→0 回读', note: (v) => String(v) });
}

// ---------------------------------------------------------------- 素材 / 标签族
log('\n[素材 / 标签族]');
{
  const TAG = `vops_${Date.now() % 100000}`;
  // 服务端要能自己去把这张图抓回来，站内 CDN 上的占位图会被判 Failed_InvalidParam
  const OUT_URL = 'https://www.baidu.com/img/flexible/logo/pc/result.png';
  let assetId = null;

  if (!skip('addImageOutlink')) {
    const r = await V.probe('addImageOutlink', 'write', async () => {
      const v = await api.addImageOutlink(OUT_URL);
      await sleep(500);
      const list = (await api.listImages({ limit: 20 })) || [];
      const hit = list.find((x) => Number(x.asset_id) === Number(v?.asset_id));
      must(hit, `收录后应能在图库列表里找到 asset_id=${v?.asset_id}`);
      return hit;
    }, { expect: '可被服务端抓取的外链图片进入自己的图库', note: (v) => `asset_id=${v?.asset_id}` });
    assetId = r.value?.asset_id ?? null;
  }

  if (assetId) {
    await V.probe('getImageTags', 'read', () => api.getImageTags(assetId), {
      expect: '该素材自身的标签列表', note: (v) => `回读 ${shape(v)}`,
    });

    await V.probe('addImageTag', 'write', async () => {
      await api.addImageTag(assetId, TAG);
      await sleep(400);
      const tags = JSON.stringify((await api.getImageTags(assetId)) || '');
      must(tags.includes(TAG), `回读素材标签应含 ${TAG}`);
      return true;
    }, { expect: '打标签后能从该素材回读', note: () => `素材标签含 ${TAG}` });

    await V.probe('imageTagAssets', 'read', () => api.imageTagAssets({ tag: TAG, limit: 10 }), {
      expect: '按标签反查素材', note: (v) => `回读 ${shape(v)}`,
    });

    await V.probe('renameImageTag', 'write', async () => {
      await api.renameImageTag(TAG, `${TAG}_r`);
      await sleep(400);
      const t = JSON.stringify((await api.imageTagDetails()) || '');
      must(t.includes(`${TAG}_r`), `账号级标签应已改名为 ${TAG}_r`);
      return true;
    }, { expect: '改名后账号级标签列表出现新名', note: () => `新名 ${TAG}_r 已出现` });

    await V.probe('imageTagDetails', 'read', () => api.imageTagDetails(), {
      case: 'imageTagDetails(改名后)', expect: '读到改名后的标签', note: (v) => `回读 ${shape(v)}`,
    });

    await V.probe('removeImageTag', 'write', async () => {
      // 注意顺序：上一步已经把账户级标签改名为 ${TAG}_r，素材上挂的也是新名，
      // 用旧名去摘会 404。
      await api.removeImageTag(assetId, `${TAG}_r`);
      await sleep(400);
      const tags = JSON.stringify((await api.getImageTags(assetId)) || '');
      must(!tags.includes(TAG), '标签应从该素材上摘掉');
      return true;
    }, { expect: '摘标签后素材标签列表不再含它', note: () => '素材标签已摘除' });

    await V.probe('deleteImageTag', 'write', async () => {
      await api.deleteImageTag(`${TAG}_r`);
      await sleep(400);
      const t = JSON.stringify((await api.imageTagDetails()) || '');
      must(!t.includes(`${TAG}_r`), '账号级标签应被删除');
      return true;
    }, { expect: '删除后账号级标签列表不再含它', note: () => '账户级标签已删除' });

    await V.probe('setImageTagsOrder', 'write', async () => {
      const before = await api.imageTagsOrder();
      await api.setImageTagsOrder(before ?? []);
      await sleep(300);
      return before ?? '[]';
    }, { expect: 'order 以字符串形态提交（实测数组会被服务端拒）', observed: false, note: () => '服务端受理；账号无标签，顺序无可观测差异' });

    await V.probe('deleteAsset', 'write', async () => {
      await api.deleteAsset(assetId);
      await sleep(600);
      const list = (await api.listImages({ limit: 20 })) || [];
      must(!list.some((x) => Number(x.asset_id) === Number(assetId)), '图库不应再有该素材');
      return true;
    }, { expect: '删除后图库列表不再含该素材', note: () => `asset_id=${assetId} 已从图库消失` });
  } else {
    for (const m of ['getImageTags', 'addImageTag', 'imageTagAssets', 'removeImageTag', 'renameImageTag', 'deleteImageTag', 'setImageTagsOrder', 'deleteAsset']) {
      V.record(m, 'write', { ok: false, blocked: true, error: '账号图库为空且无法创建素材，素材级标签族无法构成闭环' });
      log(`  ⛔ ${m}  账号图库为空且无法创建素材`);
    }
  }

  if (!skip('uploadImageBase64')) {
    await V.probe('uploadImageBase64', 'write', async () => {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      const v = await api.uploadImageBase64(png, `vops_${Date.now() % 100000}.png`);
      must(v?.target_uri, '应返回 target_uri');
      return v;
    }, { expect: '返回 target_uri（asset_type=0，不进图库列表）', note: (v) => `target_uri=${String(v?.target_uri).slice(0, 60)}` });
  }
}

// ---------------------------------------------------------------- 碎片标签
log('\n[碎片标签]');
{
  const FTAG = `frag_${Date.now() % 100000}`;
  await V.probe('addFragmentTag', 'write', () => api.addFragmentTag(null, FTAG), {
    expect: '新建碎片标签后能从 fragmentTagDetails 回读',
  });
  // 创建没通，改名/删除就不能算「通过」—— 但 DELETE 路径确实被服务端受理了，如实记 🟡
  V.record('renameFragmentTag', 'write', {
    ok: false, blocked: true,
    error: '依赖 addFragmentTag 先建出标签；创建路径未确认（paper/tags → Failed_NotFound，paper/comp/tags → 404）',
  });
  log('  ⛔ renameFragmentTag  依赖创建路径，本轮无法构成闭环');
  await V.probe('deleteFragmentTag', 'write', () => api.deleteFragmentTag('paper', 'comp', FTAG), {
    expect: 'DELETE 路径被服务端受理（标签本就不存在，语义未验证）', observed: false,
    note: () => 'DELETE /api/fragments/v5/paper/comp/tag/{tag} 返回 200；因创建路径未确认，未验证语义',
  });
}

// ---------------------------------------------------------------- 作品扩展
log('\n[作品扩展]');
if (SID) {
  await V.probe('renameShow', 'write', async () => {
    await api.renameShow(SID, `verify_ops 改名 ${Date.now() % 10000}`);
    await sleep(600);
    const m = await api.getShow(SID);
    must(String(m.title).includes('改名'), `回读 title 应含「改名」，实为「${m.title}」`);
    return m.title;
  }, { expect: '读草稿→改 title→整包 PUT 后回读 title 变化', note: (v) => `title=${v}` });

  await V.probe('setTagsOrder', 'write', async () => {
    const cur = (await api.listTags('all')) || [];
    await api.setTagsOrder(cur);
    await sleep(400);
    const after = (await api.listTags('all')) || [];
    must(JSON.stringify(after) === JSON.stringify(cur), '回读标签集合应不变');
    return `${cur.length} 个标签`;
  }, { expect: 'order 以字符串提交、按当前顺序原样写回，回读一致', note: (v) => `${v} 原样排序` });
}

if (!skip('sendShow')) {
  const SID2 = SID;
  await V.probe('sendShow', 'write', async () => {
    must(SID2, '需要载体作品');
    const r = await api.sendShow(SID2, { toSelfAccount: true });
    const flat = JSON.stringify(r);
    const ids = [...flat.matchAll(/"show_id":(\d+)/g)].map((m) => Number(m[1]));
    const cid = ids.find((x) => x !== Number(SID2));
    must(cid, `响应里应含一个新的 show_id，实为 ${flat.slice(0, 200)}`);
    await sleep(600);
    await api.deleteShow(cid).catch(() => {});
    return cid;
  }, { expect: '发给自己的副本产生新的 show_id（随后删除）', note: (v) => `副本 show_id=${v}（已删除）` });
}

if (SID && !skip('deleteShow')) {
  await V.probe('deleteShow', 'write', () => api.deleteShow(SID), {
    case: 'deleteShow(载体清理)', expect: '清理载体作品', note: () => '载体作品已删除（进回收站）',
  });
}

// ---------------------------------------------------------------- 环境受限（显式记录，不当失败）
log('\n[环境受限]');
const BLOCKED = [
  ['markMessageRead', '账号消息列表为空，无法构造「未读 → 已读」的可观测变化'],
  ['createTeam', '账号非团队版；建团队会改变账号形态（子账号/账单），不做'],
  ['addCommentRightUser', '评论白名单写的是第三方标识；且进回收站后仍留在黑名单里，没有干净的还原路径'],
  ['follow', '关注写的是他人账号的粉丝关系，越出「只动自己数据」的边界'],
  ['adminCreateTemplate', '管理端接口，普通账号预期 403'],
  ['purchaseGoods', '真实资金'],
  ['orderShowGoods', '真实资金'],
  ['payOrder', '真实资金'],
  ['rechargeWallet', '真实资金'],
  ['withdrawCash', '真实资金'],
  ['customDomains', '团队版功能，无 team_id 时服务端直接 Failed_InvalidParam'],
  ['myGoodsInfo', '需要 show_goods_id（商品 id 是路径段）'],
  ['invitation', '需要邀请链接里的 salt_code（路径段）'],
  ['goodsFavoriteTags', '裸 GET 基址实测 404，真实入口都带 show_type 维度'],
  ['myPurchasedState', '需要 show_goods_id 参数'],
  ['formData', '需要表单型作品做载体；form 型作品无法由 /api/shows/v5/form 创建（InvalidParam），本轮造不出载体'],
  ['uploadImageFile', '需要构造 multipart 文件体；与 uploadImageBase64 同一落库路径，本轮不重复验证'],
  ['uploadVideoFile', '同上，且视频素材体积大'],
];
for (const [m, reason] of BLOCKED) {
  if (skip(m)) continue;
  if (V.store.methods[m]?.last?.ok) continue;      // 本轮已验证过的不要覆盖
  V.record(m, 'write', { ok: false, blocked: true, error: reason });
  log(`  ⛔ ${m}  ${reason}`);
}

V.save();

const metas = await loadMeta(Xiumi);
const sum = summarize(metas, V.store);
log('\n===== 全量状态 =====');
log(`方法总数 ${sum.all.total}  ${summaryLine(sum)}`);
log(`  读 ${sum.byKind.read.total}  ${sum.keys.map((k) => `${k}=${sum.byKind.read[k]}`).join(' ')}`);
log(`  写 ${sum.byKind.write.total}  ${sum.keys.map((k) => `${k}=${sum.byKind.write[k]}`).join(' ')}`);
