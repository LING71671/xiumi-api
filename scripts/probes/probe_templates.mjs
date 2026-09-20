/**
 * probe_templates.mjs — 看官方模板库能不能直接产出可用的组件结构（含图片组件）
 */
import path from 'node:path';
import fs from 'node:fs';
import { Xiumi } from '../client/xiumi.mjs';
import { CAPTURE_DIR, SESSION_FILE } from '../cfg.mjs';
const log = (...a) => console.log(...a);
const api = await Xiumi.loadSession(SESSION_FILE);
await api._me();

function shape(v, d = 0) {
  if (d > 3) return '…';
  if (Array.isArray(v)) return `[${v.length}${v.length ? ' of ' + shape(v[0], d + 1) : ''}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).slice(0, 14).join(',')}}`;
  return typeof v;
}

const t = await api.listTemplates({ tagCategory: 'paper-cp' }).catch((e) => ({ _err: e.message, code: e.code }));
log('listTemplates ->', JSON.stringify(t).slice(0, 700));
log('shape:', shape(t));

const arr = Array.isArray(t) ? t : t?.templates || t?.items || t?.list || [];
log(`条目数 ${arr.length}`);
if (arr.length) {
  log('第一条 keys:', Object.keys(arr[0]).join(','));
  log('第一条:', JSON.stringify(arr[0]).slice(0, 500));
}

// 逐个字段探：tags_tree
const tree = await api.templateTagsTree().catch((e) => ({ _err: e.message }));
log('\ntemplateTagsTree ->', JSON.stringify(tree).slice(0, 400));

// 找一个 atom_tpl_id 再取 items
const id = arr[0]?.atom_tpl_id || arr[0]?.id || arr[0]?.tpl_id;
if (id) {
  const it = await api.templateItems(id).catch((e) => ({ _err: e.message, code: e.code }));
  log(`\ntemplateItems(${id}) ->`, JSON.stringify(it).slice(0, 900));
  log('shape:', shape(it));
  fs.writeFileSync(path.join(CAPTURE_DIR, 'samples/template_item.json'), JSON.stringify(it, null, 2).slice(0, 400000));
}

// 拿官方原型列表（official2）看有没有含图片的作品
const off = await api.officialShows({ type: 'paper', limit: 3 }).catch((e) => ({ _err: e.message }));
const offArr = off?.shows || off || [];
log(`\nofficialShows -> ${Array.isArray(offArr) ? offArr.length : JSON.stringify(off).slice(0, 200)}`);
if (Array.isArray(offArr) && offArr.length) {
  log('  第一条 keys:', Object.keys(offArr[0]).join(','));
  const meta = await api.getShow(offArr[0].show_id).catch((e) => null);
  if (meta) {
    const { data } = await api.readShowData(meta).catch(() => ({ data: null }));
    if (data) {
      const items = data.cubes?.[0]?.pages?.[0]?.layers?.flatMap((l) => l.comps?.items || []) || [];
      log(`  官方原型 pages=${data.cubes?.[0]?.pages?.length} page0.items=${items.length} tplIds=[${items.map((c) => c._comp?.tplId).join(', ')}]`);
      const imgComp = items.find((c) => JSON.stringify(c).includes('img') || JSON.stringify(c).includes('image'));
      if (imgComp) {
        log('  ★ 找到图片组件，结构：');
        log(JSON.stringify(imgComp).slice(0, 1200));
        fs.writeFileSync(path.join(CAPTURE_DIR, 'samples/real_image_comp.json'), JSON.stringify(imgComp, null, 2));
      }
      // 全量搜所有页找图片组件
      let found = null;
      for (const cube of data.cubes || []) for (const pg of cube.pages || []) for (const ly of pg.layers || []) {
        for (const c of ly.comps?.items || []) {
          const k = Object.keys(c).filter((x) => x !== '_comp');
          if (k.some((x) => /^img|image|cell/i.test(x))) { found = { tplId: c._comp?.tplId, keys: k, comp: c }; break; }
        }
        if (found) break;
      }
      if (found && !imgComp) {
        log(`  ★ 图片组件 tplId=${found.tplId} keys=[${found.keys.join(',')}]`);
        log(JSON.stringify(found.comp).slice(0, 1400));
        fs.writeFileSync(path.join(CAPTURE_DIR, 'samples/real_image_comp.json'), JSON.stringify(found.comp, null, 2));
      }
    }
  }
}
