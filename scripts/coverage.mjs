/**
 * coverage.mjs — 把 data/verification.json 渲染成可读的覆盖率报告
 *
 * 这是「方法验证状态」的唯一人读出口：
 *   docs/COVERAGE.md   逐方法台账（含证据：哪个脚本、哪个用例、什么时候、什么结果）
 *   data/coverage.json 纯数字，供 README / PARITY.md 引用，避免手写数字各处漂移
 *
 * 状态只来自 verification.json，**不由人写**。源码里的 `[未实测]` 只是「声明」，
 * 单独一列列出，不冒充结论。
 *
 * 用法：node scripts/coverage.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './cfg.mjs';
import { loadMeta } from './lib/methodmeta.mjs';
import { loadStore, statusOf, summarize, MARK } from './lib/verification.mjs';
import { Xiumi } from '../client/xiumi.mjs';

const DOCS = path.join(ROOT, 'docs');
const DATA = path.join(ROOT, 'data');

const metas = await loadMeta(Xiumi);
const store = loadStore();
const sum = summarize(metas, store);

const rows = metas.map((m) => {
  const st = statusOf(m, store);
  return {
    name: m.name,
    kind: m.write ? 'write' : 'read',
    risks: m.risks,
    declared: !!m.hintUntested,
    status: st.status,
    label: st.label,
    last: st.entry?.last || null,
    everVerified: !!st.entry?.everVerified,
  };
});

// 列顺序（表格表头与行必须共用同一份顺序，否则数字会错位）
const COLUMNS = ['verified', 'accepted', 'regressed', 'failed', 'blocked', 'declared', 'unknown'];
// 排序用的关注度顺序：越靠前越需要看
const ATTENTION = ['failed', 'regressed', 'blocked', 'accepted', 'declared', 'unknown', 'verified'];
const sorted = [...rows].sort(
  (a, b) => ATTENTION.indexOf(a.status) - ATTENTION.indexOf(b.status) || a.name.localeCompare(b.name)
);

const coverage = {
  generatedAt: new Date().toISOString(),
  verificationUpdatedAt: store.updatedAt,
  total: sum.all.total,
  byKind: {
    read: { ...sum.byKind.read },
    write: { ...sum.byKind.write },
  },
  all: { ...sum.all },
  counts: Object.fromEntries(COLUMNS.map((k) => [k, sum.all[k]])),
};
fs.writeFileSync(path.join(DATA, 'coverage.json'), JSON.stringify(coverage, null, 2) + '\n', 'utf8');

// ---------------------------------------------------------------- COVERAGE.md
const ev = (r) => {
  if (!r.last) return '—';
  const bits = [`\`${r.last.script}\``, r.last.case !== r.name ? `\`${r.last.case}\`` : '', r.last.at.slice(0, 16).replace('T', ' ')];
  return bits.filter(Boolean).join(' · ');
};
const why = (r) => {
  if (r.last?.error) return r.last.error;
  if (r.last?.note) return r.last.note;
  if (r.last?.ok) return r.last.note || '通过';
  return '—';
};
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

const kindLabel = { read: '读', write: '写' };
function table(list, kind) {
  const head = '| 方法 | 类型 | 状态 | 风险标注 | 证据（脚本 · 用例 · 时间） | 说明 / 错误 |\n|---|---|---|---|---|---|';
  const body = list
    .filter((r) => r.kind === kind)
    .map((r) => `| \`${r.name}\` | ${kindLabel[kind]} | ${r.label} | ${r.risks.join(' ') || '—'} | ${ev(r)} | ${cell(why(r))} |`);
  return [head, ...body].join('\n');
}

const n = (k) => sum.all[k];
let md = `# 方法验证覆盖率

> 由 \`node scripts/coverage.mjs\` 生成 —— **数字与状态全部来自 \`data/verification.json\`**，
> 而那份文件只能由 \`scripts/verify_matrix.mjs\` / \`scripts/verify_ops.mjs\` 等验证脚本**回写**。
> 人不再手写「这个方法验过没有」。生成时间：${coverage.generatedAt}；
> 最近一次验证：${coverage.verificationUpdatedAt || '（无记录）'}。

## 这一页在回答什么

「浏览器里能操作的，这里都能操作」这个标准下，真正的风险不是**接口有没有**，
而是**我敢不敢说它通了**。所以每个方法只有两种可信状态：

- 有**脚本跑出来的证据**（✅ / 🟡 / ❌ / ⛔）
- 没有证据（◻ / ❔）

源码 JSDoc 里的 \`[未实测]\` 是当初凭记忆写的**声明**，单独一列「风险标注」里列出，
**不参与**上面的状态判定。

## 状态含义

| 标记 | 含义 | 判据 |
|---|---|---|
| ${MARK.verified} | 端到端跑通 | 写操作有**回读断言**（改完能读回预期变化）；只读操作路由+鉴权+参数形状都通 |
| ${MARK.accepted} | 调用被接受 | 写请求返回成功，但该账号上读不出可观测差异（如只影响外观的偏好键） |
| ${MARK.regressed} | 曾通过、本次失败 | 历史上有过通过记录，最近一次跑失败 |
| ${MARK.failed} | 实测未通过 | 脚本跑了，拿到 404 / 400 / 拒绝 —— **这是最有价值的一类**，见下面清单 |
| ${MARK.blocked} | 环境受限 | 账号能力不具备（无团队版、无消息、无流量包、要真实资金）或不可逆。**不是方法的错** |
| ${MARK.declared} | 声明未实测 | 源码 JSDoc 写了 \`[未实测]\`，且没有任何脚本证据 |
| ${MARK.unknown} | 无记录 | 既没声明也没跑过 |

## 总览

| 范围 | 合计 | ${COLUMNS.map((k) => MARK[k]).join(' | ')} |
|---|${'---|'.repeat(8)}
| 全部 | ${sum.all.total} | ${COLUMNS.map((k) => n(k)).join(' | ')} |
| 读 | ${sum.byKind.read.total} | ${COLUMNS.map((k) => sum.byKind.read[k]).join(' | ')} |
| 写 | ${sum.byKind.write.total} | ${COLUMNS.map((k) => sum.byKind.write[k]).join(' | ')} |

- **有脚本证据的**：${n('verified') + n('accepted') + n('failed') + n('blocked')} / ${sum.all.total}
  （其中 ✅${n('verified')} 🟡${n('accepted')} ❌${n('failed')} ⛔${n('blocked')}）
- **没有任何证据的**：${n('declared') + n('unknown')} / ${sum.all.total}
  （其中源码声明过未实测的 ◻${n('declared')}，完全无记录的 ❔${n('unknown')}）

## 待修：实测未通过（${n('failed')}）

这些不是「不敢说」，是**已知不对**。要么路径错、要么 body 契约错，
在修好之前不要用。

| 方法 | 类型 | 证据 | 错误 |
|---|---|---|---|
${rows.filter((r) => r.status === 'failed').map((r) => `| \`${r.name}\` | ${kindLabel[r.kind]} | ${ev(r)} | ${cell(r.last?.error)} |`).join('\n')}

## 明细

### 读操作（${sum.byKind.read.total}）

${table(sorted, 'read')}

### 写操作（${sum.byKind.write.total}）

${table(sorted, 'write')}

---

## 怎么补

\`\`\`bash
node scripts/verify_matrix.mjs            # 作品写链路（建→改→回读→删→恢复）
node scripts/verify_ops.mjs               # 只读面 + 素材/标签/设置/消息（可逆、零副作用）
node scripts/verify_ops.mjs --only=setMute  # 只跑某个方法
node scripts/coverage.mjs                 # 重新生成本页与 data/coverage.json
\`\`\`

两条纪律：**写操作必须带回读断言**（只回 \`code=0\` 不算通过）；
**做不到可逆的宁可不测**，记 ⛔ 并写清原因，不产出假阴性。
`;

fs.writeFileSync(path.join(DOCS, 'COVERAGE.md'), md, 'utf8');

console.log('覆盖率报告已生成');
console.log('  docs/COVERAGE.md');
console.log('  data/coverage.json');
console.log(`  合计 ${sum.all.total}  有证据 ${n('verified') + n('accepted') + n('failed') + n('blocked')}` +
  `  ✅${n('verified')} 🟡${n('accepted')} ❌${n('failed')} ⛔${n('blocked')} ◻${n('declared')} ❔${n('unknown')}`);
