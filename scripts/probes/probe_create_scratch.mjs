/**
 * probe_create_from_scratch.mjs — 从零构造一份作品（不克隆任何已有作品）
 *
 *   1. 上传一张图片到素材库
 *   2. buildShow() 空骨架 → appendPage(文本) → POST 新建
 *   3. appendPage(文本 + 图片) → PUT 追加
 *   4. Playwright 打开编辑器页，确认文本与图片都渲染出来
 */
import path from 'node:path';
import fs from 'node:fs';
import { Xiumi, textComp, imageComp, emptyShow, emptyCube, emptyPage, emptyGround, SHOW_TYPES } from '../client/xiumi.mjs';
import { CAPTURE_DIR, SESSION_FILE } from '../cfg.mjs';

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MARK = `AIGEN${Date.now() % 1000000}`;
const rec = { mark: MARK, steps: [] };

// 1x1 红色 PNG
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

(async () => {
  const api = await Xiumi.loadSession(SESSION_FILE);
  const me = await api._me();
  log(`账号 ${me.nickname}  uid=${me.unique_uid}`);
  log(`支持的作品类型：${SHOW_TYPES.join(' / ')}\n`);

  // ---------------- 1. 上传图片 ----------------
  log('[1] 上传图片到素材库');
  let img = null;
  for (const mode of ['raw', 'dataUri']) {
    try {
      const buf = Buffer.from(PNG_1PX, 'base64');
      const r = await api.uploadImageBase64(buf, `aigen_${Date.now()}.png`, { dataUri: mode === 'dataUri' });
      log(`  ${mode} -> 成功  ${JSON.stringify(r).slice(0, 260)}`);
      img = r;
      rec.upload = { mode, ok: true, keys: r && typeof r === 'object' ? Object.keys(r) : null, target_uri: r?.target_uri, url: r?.url, src: r?.src };
      break;
    } catch (e) {
      log(`  ${mode} -> 失败  ${e.message}${e.code ? ' code=' + e.code : ''}`);
      rec.upload = { mode, ok: false, err: String(e.message), code: e.code };
    }
  }
  const imgUrl = img?.target_uri || img?.url || img?.src || img?.image_url;
  log(`  图片地址：${imgUrl || '(未拿到)'}`);

  const listAfter = await api.listImages({ limit: 3 }).catch((e) => ({ _err: e.message }));
  log(`  图库列表：${JSON.stringify(listAfter).slice(0, 300)}`);

  // ---------------- 2. 从零构造 ----------------
  log('\n[2] 从零构造作品（不克隆任何已有作品）');
  const show = api.buildShow('paper', `${MARK} 从零AI创作`);
  log(`  buildShow -> cubes=${show.cubes.length} pages=${show.cubes[0].pages.length} grounds=${show.cubes[0].grounds.length}`);
  log(`  page tplId=${show.cubes[0].pages[0]._comp.tplId}  layer tplId=${show.cubes[0].pages[0].layers[0]._comp.tplId}`);

  api.appendPage(show, {
    texts: [
      `<p style="text-align:center"><strong>${MARK}</strong></p>`,
      `<p>这一页的每一个组件都是通过接口直接构造的，没有克隆任何已有作品。</p>`,
    ],
  });
  log(`  appendPage(文本) -> pages=${show.cubes[0].pages.length}`);

  const created = await api.createShow('paper', show).catch((e) => ({ _err: e.message, code: e.code, status: e.status }));
  if (created._err) { log(`  创建失败：${created._err} code=${created.code}`); rec.create = { ok: false, err: created._err, code: created.code }; fs.writeFileSync(path.join(CAPTURE_DIR, 'probe_create_scratch.json'), JSON.stringify(rec, null, 2)); return; }
  const sid = created.show_id;
  log(`  创建成功 show_id=${sid}`);
  rec.create = { ok: true, show_id: sid, show_url: created.show_url, edit_url: created.edit_url };

  // ---------------- 3. 回读验证结构 ----------------
  await sleep(1500);
  let meta = await api.getShow(sid);
  let { data: cur } = await api.readShowData(meta, { editing: true });
  log(`\n[3] 回读`);
  log(`  pages=${cur.cubes[0].pages.length} grounds=${cur.cubes[0].grounds.length}`);
  for (let i = 0; i < cur.cubes[0].pages.length; i++) {
    const items = cur.cubes[0].pages[i].layers.flatMap((l) => l.comps?.items || []);
    log(`  page[${i}] items=${items.length} tplIds=[${items.map((c) => c._comp?.tplId).join(', ')}]`);
  }
  rec.afterCreate = { pages: cur.cubes[0].pages.length, grounds: cur.cubes[0].grounds.length };

  // ---------------- 4. 追加带图片的一页 ----------------
  if (imgUrl) {
    log('\n[4] 追加一页（文本 + 图片）');
    api.appendPage(cur, {
      texts: [`<p>第二页：这一页带一张通过接口上传的图片。</p>`],
      imageSrc: imgUrl,
    });
    const put = await api.updateShow(meta, cur).catch((e) => ({ _err: e.message, code: e.code }));
    log(`  PUT -> ${typeof put === 'string' ? put : JSON.stringify(put).slice(0, 100)}`);
    rec.put = typeof put === 'string' ? put : String(put._err || 'ok');
    await sleep(1500);
    meta = await api.getShow(sid);
    const r2 = await api.readShowData(meta, { editing: true });
    cur = r2.data;
    log(`  回读 pages=${cur.cubes[0].pages.length}`);
    const items1 = cur.cubes[0].pages[1]?.layers.flatMap((l) => l.comps?.items || []) || [];
    log(`  page[1] items=${items1.length} tplIds=[${items1.map((c) => c._comp?.tplId).join(', ')}]`);
    const hasImg = JSON.stringify(items1).includes(imgUrl);
    log(`  page[1] 含图片地址=${hasImg}`);
    rec.page2 = { items: items1.length, hasImage: hasImg };
  } else {
    log('\n[4] 跳过（没拿到图片地址）');
  }

  rec.final = { show_id: sid, edit_url: meta.edit_url, show_url: meta.show_url, pages: cur.cubes[0].pages.length };
  log(`\n编辑器页：https://xiumi.us${meta.edit_url}`);
  fs.writeFileSync(path.join(CAPTURE_DIR, 'probe_create_scratch.json'), JSON.stringify(rec, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
