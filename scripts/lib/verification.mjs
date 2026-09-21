// verification.mjs — 方法验证状态的唯一权威存储
//
// 为什么要有这个文件：
//   在此之前，「这个方法验过没有」写在 client/xiumi.mjs 的 JSDoc 里（`[未实测]`），
//   靠人记。结果 399 个方法里有过半既不能说通、也不能说没通 —— 状态不明。
//   这里把状态改成**只能由脚本跑出来的结果写入**，人写的那份降级成「声明/线索」，
//   两者分开存储、分开渲染，谁也不冒充谁。
//
// 存储：data/verification.json
//   {
//     "schema": 1,
//     "updatedAt": "<iso>",
//     "methods": {
//       "<客户端方法名>": {
//         "kind": "read" | "write",
//         "everVerified": true,             // 历史上有过通过记录
//         "firstVerifiedAt": "<iso>",
//         "last": { "at", "script", "case", "ok", "blocked", "ms", "note", "error" },
//         "runs": [ …同 last 结构，最多 MAX_RUNS 条… ]
//       }
//     }
//   }
//
// 渲染约定（coverage.mjs / cli.mjs 共用）：
//   last.ok 且 observed !== false → ✅ 实测通过（语义已验证：回读到预期变化）
//   last.ok 但 observed === false → 🟡 调用被接受（路由/鉴权/体格式通过，但无可观测回读字段）
//   last.blocked       → ⛔ 环境受限（不是失败，是没有条件）
//   !last.ok 且 everVerified → ⚠️ 曾通过、本次失败
//   !last.ok           → ❌ 实测未通过
//   无记录 + 源码声明 [未实测] → ◻ 声明未实测（人写的，未跑）
//   无记录             → ❔ 无任何记录
//
// 「🟡」这一档是必要的：有些写接口在空账号上写完读不出任何字段差异（如
// `/api/user_setting`）。把这种情形混进 ✅ 会让「实测通过」注水；
// 直接算 ❌ 又冤枉了它 —— 它确实被服务端受理了。所以单列一档。
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../cfg.mjs';

export const STORE_FILE = path.join(ROOT, 'data', 'verification.json');
const MAX_RUNS = 20;

/** 渲染用的状态标签 —— 文档、CLI、报告三处必须一致，所以只在这里定义 */
export const MARK = {
  verified: '✅ 实测通过',
  accepted: '🟡 调用被接受',
  regressed: '⚠️ 曾通过/本次失败',
  failed: '❌ 实测未通过',
  blocked: '⛔ 环境受限',
  declared: '◻ 声明未实测',
  unknown: '❔ 无记录',
};

export function emptyStore() {
  return { schema: 1, updatedAt: new Date().toISOString(), methods: {} };
}

export function loadStore() {
  if (!fs.existsSync(STORE_FILE)) return emptyStore();
  try {
    const s = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    if (!s.methods) s.methods = {};
    s.schema ||= 1;
    return s;
  } catch (e) {
    throw new Error(`${path.relative(ROOT, STORE_FILE)} 解析失败：${e.message}`);
  }
}

export function saveStore(store) {
  store.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2) + '\n', 'utf8');
}

/**
 * 记录器：一个验证脚本一个实例，跑完 save()。
 * 合并语义 —— 只覆盖本次碰过的方法，其余条目不丢（所以可以分脚本、分批跑）。
 */
export class Verifier {
  constructor({ script, dryRun = false } = {}) {
    if (!script) throw new Error('Verifier 需要 script 名，用于证据溯源');
    this.script = script;
    this.dryRun = dryRun;
    this.store = loadStore();
    this.touched = new Set();
  }

  /**
   * @param {string} method  客户端方法名（与运行时自省一致）
   * @param {'read'|'write'} kind
   * @param {{ok:boolean, blocked?:boolean, case?:string, note?:string, error?:string, ms?:number, observed?:boolean}} r
   */
  record(method, kind, r) {
    const run = {
      at: new Date().toISOString(),
      script: this.script,
      case: r.case || method,
      ok: !!r.ok,
      ...(r.blocked ? { blocked: true } : {}),
      ...(r.observed === false ? { observed: false } : {}),
      ...(Number.isFinite(r.ms) ? { ms: r.ms } : {}),
      ...(r.note ? { note: String(r.note).slice(0, 300) } : {}),
      ...(r.error ? { error: String(r.error).slice(0, 300) } : {}),
    };
    const e = this.store.methods[method] || { kind, everVerified: false, runs: [] };
    e.kind = kind || e.kind;
    if (run.ok && !e.everVerified) {
      e.everVerified = true;
      e.firstVerifiedAt = run.at;
    }
    e.last = run;
    e.runs = [...(e.runs || []), run].slice(-MAX_RUNS);
    this.store.methods[method] = e;
    this.touched.add(method);
    return run;
  }

  /**
   * 包一层，把「跑一个探测」这件事的计时、记录、日志统一掉。
   * @param {{case?:string, expect?:string, observed?:boolean, note?:(value:any)=>string}} opts
   *   note 传函数时，会用返回值生成备注 —— 用于记录「实际拿到了什么形状」。
   */
  async probe(method, kind, fn, { case: caseName, expect, observed = true, note } = {}) {
    const t0 = Date.now();
    const ms = () => Date.now() - t0;
    try {
      const value = await fn();
      const extra = typeof note === 'function' ? note(value) : undefined;
      this.record(method, kind, {
        ok: true,
        case: caseName,
        ms: ms(),
        observed,
        note: [expect ? `期望：${expect}` : '', extra].filter(Boolean).join('；') || undefined,
      });
      console.log(`  ${observed ? '✅' : '🟡'} ${method}${caseName && caseName !== method ? ` [${caseName}]` : ''}`);
      return { ok: true, value };
    } catch (e) {
      const blocked = !!e.blocked;
      this.record(method, kind, {
        ok: false,
        blocked,
        case: caseName,
        ms: ms(),
        error: e.message,
        note: expect ? `期望：${expect}` : undefined,
      });
      console.log(`  ${blocked ? '⛔' : '❌'} ${method}${caseName && caseName !== method ? ` [${caseName}]` : ''}  ${e.message}`);
      return { ok: false, error: e };
    }
  }

  save() {
    if (this.dryRun) {
      console.log(`[dry] 不写回 ${path.relative(ROOT, STORE_FILE)}（本次记录 ${this.touched.size} 个方法）`);
      return;
    }
    saveStore(this.store);
    console.log(`\n状态已回写 -> data/verification.json（本次更新 ${this.touched.size} 个方法）`);
  }
}

/** 标记「环境不具备」，与「失败」区分开。计不计入覆盖率缺口，由报告层决定。 */
export class Blocked extends Error {
  constructor(message) {
    super(message);
    this.blocked = true;
  }
}

/** 渲染层：给定方法元数据 + 存储，返回 {status, label, entry} */
export function statusOf(meta, store) {
  const entry = store.methods?.[meta.name];
  const last = entry?.last;
  if (!last) {
    return { status: meta.hintUntested ? 'declared' : 'unknown', label: meta.hintUntested ? MARK.declared : MARK.unknown, entry };
  }
  if (last.ok) {
    return last.observed === false
      ? { status: 'accepted', label: MARK.accepted, entry }
      : { status: 'verified', label: MARK.verified, entry };
  }
  if (last.blocked) return { status: 'blocked', label: MARK.blocked, entry };
  if (entry.everVerified) return { status: 'regressed', label: MARK.regressed, entry };
  return { status: 'failed', label: MARK.failed, entry };
}

/** 按 读/写 × 状态 汇总。报告与 PARITY 的数字都从这里出，不手写。 */
export function summarize(metas, store) {
  const keys = ['verified', 'accepted', 'regressed', 'failed', 'blocked', 'declared', 'unknown'];
  const blank = () => ({ total: 0, verified: 0, accepted: 0, regressed: 0, failed: 0, blocked: 0, declared: 0, unknown: 0 });
  const all = blank();
  const byKind = { read: blank(), write: blank() };
  for (const m of metas) {
    const kind = m.write ? 'write' : 'read';
    const st = statusOf(m, store).status;
    all.total++; byKind[kind].total++;
    all[st]++; byKind[kind][st]++;
  }
  return { all, byKind, keys, updatedAt: store.updatedAt };
}

/** 覆盖率一行文字，多处复用，避免数字各处漂移 */
export function summaryLine(sum) {
  return sum.keys.map((k) => `${MARK[k]} ${sum.all[k]}`).join(' · ');
}
