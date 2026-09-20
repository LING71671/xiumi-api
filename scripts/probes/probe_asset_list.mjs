import path from 'node:path';
import { Xiumi } from '../client/xiumi.mjs';
import { SESSION_FILE } from '../cfg.mjs';
const log = (...a) => console.log(...a);
const api = await Xiumi.loadSession(SESSION_FILE);
await api._me();

// A. 看 727022072 的 page[2] 是否真的带图
const meta = await api.getShow(727022072);
const { data } = await api.readShowData(meta, { editing: true });
log(`show 727022072 pages=${data.cubes[0].pages.length}`);
data.cubes[0].pages.forEach((p, i) => {
  const items = p.layers.flatMap((l) => l.comps?.items || []);
  log(`  page[${i}] items=${items.length}`);
  items.forEach((c, j) => log(`     [${j}] tplId=${c._comp?.tplId}  keys=${Object.keys(c).filter((k) => k !== '_comp').join(',')}  ${JSON.stringify(c.img1 || c.txt1 || {}).slice(0, 120)}`));
});

// B. listImages 原始返回
log('\n--- listImages raw ---');
const raw = await api.request('GET', '/api/assets/list/image', { query: { limit: 5, offset: 0 }, raw: true });
log(JSON.stringify(raw).slice(0, 800));
log('\n--- imagesCount raw ---');
log(JSON.stringify(await api.request('GET', '/api/assets/list/image/count', { raw: true })).slice(0, 300));
log('\n--- 带空 search ---');
log(JSON.stringify(await api.request('GET', '/api/assets/list/image', { query: { limit: 5, offset: 0, search: '' }, raw: true })).slice(0, 500));
