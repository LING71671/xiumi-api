// methodmeta.mjs — 客户端方法元数据的唯一来源
//
// 谁在用：scripts/cli.mjs（list / describe / CAPABILITIES.md）、
//         scripts/coverage.mjs（覆盖率报告）、scripts/lib/verification.mjs（读/写分组）
//
// 两条铁律（都是踩过坑换来的）：
//   1. 方法全集以**运行时自省**为准，静态解析只补签名与注释。
//      反过来做会漏方法（访问器、签名里嵌函数调用的写法）。
//   2. 写操作判定必须剥注释后再看 `this.request('POST'|'PUT'|'DELETE'|'PATCH')`，
//      否则 JSDoc 里举例的调用会把只读方法误判成写操作。
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../cfg.mjs';

const CLIENT = path.join(ROOT, 'client', 'xiumi.mjs');

/** 命名启发式：仅用于提示，不参与任何拦截 */
export const RISK_RULES = [
  [/^(delete|clear|remove|reset|destroy)/i, '删除/清空'],
  [/(withdraw|pay|recharge|transfer|refund|brokerage)/i, '资金'],
  [/(password|unbind|bind[A-Z]|apikey|secret|phone|email)/i, '账号凭据'],
  [/^(set|update|change)/, '修改'],
];

const HTTP_WRITE = /this\.request\(\s*['"](POST|PUT|DELETE|PATCH)['"]/;

/** 剥掉注释，避免注释里举例的 `this.request('POST', ...)` 被当成真实调用 */
export function stripComments(code) {
  return code.replace(/^\s*\/\/[^\n]*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** 静态解析源码，产出 方法名 → {args, doc, write, hintUntested} */
export function parseSource() {
  const src = fs.readFileSync(CLIENT, 'utf8');
  // 参数串用非贪婪 `[\s\S]*?` 而不是 `[^)]*`：签名里可能嵌函数调用
  // （如 `comments(show_id, { ver = Date.now(), ...rest } = {})`），
  // `[^)]*` 会在 `Date.now()` 的右括号处断掉，整条方法就漏了。
  // 访问器 `get get()` / `set foo()` 必须单独识别，否则它们的代码会落进
  // 上一个方法的切片，把上一个方法误判成写操作。
  const re = /^  (?:(static)\s+)?(?:(async)\s+)?(?:(get|set)\s+)?([a-zA-Z_$][\w$]*)\s*\(([\s\S]*?)\)\s*\{/gm;
  const raw = [];
  let m;
  while ((m = re.exec(src))) {
    raw.push({
      name: m[4],
      isStatic: !!m[1],
      accessor: m[3] || null,
      args: m[5].replace(/\s+/g, ' ').trim(),
      start: m.index,
      sigEnd: re.lastIndex,
    });
  }
  const out = new Map();
  const bodyOf = new Map();
  raw.forEach((h, i) => {
    const end = i + 1 < raw.length ? raw[i + 1].start : src.length;
    let body = src.slice(h.sigEnd, end);
    // 下一个方法的 JSDoc 落在本块尾部，里面常写着 `put("/api/...")` 之类，
    // 不裁掉会把上一个方法误判成写操作。
    const tailDoc = body.search(/\/\*\*[\s\S]*?\*\/\s*$/);
    if (tailDoc >= 0) body = body.slice(0, tailDoc);

    // JSDoc 必须**紧贴**签名（中间只有空白）。`[\s\S]*` 贪婪是为了让 `\/\*\*`
    // 落在最靠后的那个，否则会从更早的 `/**` 一路吞到签名前，把上一个方法的
    // 文档甚至代码当成这一条的说明。
    const before = src.slice(Math.max(0, h.start - 4000), h.start);
    const dm = before.match(/[\s\S]*\/\*\*([\s\S]*?)\*\/\s*$/);
    const doc = (dm ? dm[1] : '').replace(/^\s*\*s?/gm, ' ').replace(/\s+/g, ' ').trim();
    const clean = stripComments(body);
    bodyOf.set(h.name, clean);
    out.set(h.name, {
      name: h.name,
      isStatic: h.isStatic,
      accessor: h.accessor,
      args: h.args,
      doc,
      // 「声明未实测」是**人写的旧标注**，只作线索用。真实状态一律看
      // data/verification.json（脚本跑出来的）。两者语义不同，不合并。
      hintUntested: /\[未实测\]/.test(doc),
      write: HTTP_WRITE.test(clean),
    });
  });

  // 第二遍：包装器本身不发请求，但它调用的方法是写（如 renameShow → updateShow）。
  // 不做这一遍，这类方法会被静态推断成「读」，误导使用者。
  for (let round = 0; round < 4; round++) {
    let changed = false;
    for (const [name, body] of bodyOf) {
      const e = out.get(name);
      if (e.write) continue;
      for (const m of body.matchAll(/this\.([a-zA-Z_$][\w$]*)\s*\(/g)) {
        const callee = out.get(m[1]);
        if (callee?.write) { e.write = true; changed = true; break; }
      }
    }
    if (!changed) break;
  }
  return out;
}

/**
 * 方法全集以**运行时自省**为准，静态解析只负责补签名与注释。
 * 反过来做会漏方法（简写助手、getter、正则覆盖不到的写法），
 * 而「全都做」的前提是目录必须完整。
 */
export async function loadMeta(Xiumi) {
  const names = [
    ...Object.getOwnPropertyNames(Xiumi.prototype).filter(
      (n) => n !== 'constructor' && typeof Xiumi.prototype[n] === 'function'
    ),
    ...Object.getOwnPropertyNames(Xiumi).filter((n) => typeof Xiumi[n] === 'function'),
  ];
  const parsed = parseSource();
  return [...new Set(names)].map((name) => {
    const meta = parsed.get(name) || { name, isStatic: false, accessor: null, args: '', doc: '', hintUntested: false, write: false };
    meta.risks = RISK_RULES.filter(([rx]) => rx.test(name)).map(([, label]) => label);
    return meta;
  });
}

export function riskTag(m) {
  const parts = [m.write ? '写' : '读', ...m.risks];
  return parts.join(' · ');
}
