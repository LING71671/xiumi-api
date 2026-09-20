import path from 'node:path';
import { Xiumi } from '../client/xiumi.mjs';
import { SESSION_FILE } from '../cfg.mjs';
const api = await Xiumi.loadSession(SESSION_FILE);
await api._me();
const l = await api.listShows({ type: 'paper', limit: 30 });
const s = l.shows || l;
console.log(`live ${s.length}`);
for (const x of s) console.log(`  ${x.show_id}  ${x.title}  saved=${x.saved_at}`);
// 删掉那次图片渲染失败的中间产物
const del = await api.deleteShow(727022072).catch((e) => ({ _err: e.message }));
console.log('delete 727022072 ->', JSON.stringify(del).slice(0, 100));
const l2 = await api.listShows({ type: 'paper', limit: 30 });
console.log(`live after ${(l2.shows || l2).length}`);
for (const x of (l2.shows || l2)) console.log(`  ${x.show_id}  ${x.title}`);
