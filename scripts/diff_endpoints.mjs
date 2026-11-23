// diff_endpoints.mjs — 找出「前端 bundle 里有、客户端没封装」的接口
//
// 为什么不用 extract_endpoints.mjs 的输出直接比：
//   那个脚本为了给 `o.get(BASE + "/x")` 这类基址变量拼路径，会做词法作用域解析；
//   解析错一次，`/api/teams/{id}/members` 就会被记成 `/api/shows/members`（基址串了）。
//   这里换个思路：**只信字面量**。以 `/api/...` 开头的调用点直接取证，不做基址推断，
//   所以不会张冠李戴，代价是漏掉纯变量式的调用。
//
// 用法：
//   node scripts/diff_endpoints.mjs            # 读 capture/assets + capture/js
//   node scripts/diff_endpoints.mjs --json     # 只输出 JSON
//
// 输出：capture/diff_new.json（新接口）、capture/diff_dead.json（客户端有、bundle 里没再出现）
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, CAPTURE_DIR } from './cfg.mjs';

const SCAN_DIRS = [path.join(CAPTURE_DIR, 'assets'), path.join(CAPTURE_DIR, 'js')];
const CLIENT = path.join(ROOT, 'client', 'xiumi.mjs');

const files = [];
for (const d of SCAN_DIRS) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) if (/\.(js|html)$/i.test(f)) files.push(path.join(d, f));
}
if (!files.length) {
  console.error('没有可扫描的 bundle：先把前端资源抓到 capture/assets 或 capture/js');
  process.exit(2);
}

// ---------------------------------------------------------------- 工具

/** 从 i 处读一个字符串字面量（含引号），返回 {text, end} */
function readString(s, i) {
  const q = s[i];
  if (q !== '"' && q !== "'" && q !== '`') return null;
  let out = '';
  let j = i + 1;
  while (j < s.length) {
    const c = s[j];
    if (c === '\\') { out += s[j + 1] ?? ''; j += 2; continue; }
    if (c === q) return { text: out, end: j + 1 };
    out += c;
    j++;
  }
  return null;
}

/** 解析 `"/api/a/" + e + "/b/" + t.id` 这种拼接链，表达式操作数折成 {param} */
function readConcatChain(s, i) {
  let out = '';
  let j = i;
  let pieces = 0;
  while (pieces++ < 10 && j < s.length) {
    while (j < s.length && /\s/.test(s[j])) j++;
    const lit = readString(s, j);
    if (lit) {
      // 后续字符串片段必须像路径片段，否则视为链结束
      if (pieces > 1 && !lit.text.startsWith('/')) break;
      out += lit.text;
      j = lit.end;
    } else {
      // 表达式操作数：读到 `+` / `,` / `)` / `;` 为止（括号内允许）
      let k = j;
      let depth = 0;
      while (k < s.length) {
        const c = s[k];
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth--; }
        else if (depth === 0 && (c === '+' || c === ',' || c === ';' || c === '\n')) break;
        k++;
      }
      const expr = s.slice(j, k).trim();
      if (!expr || expr.length > 80) break;
      out += '{param}';
      j = k;
    }
    while (j < s.length && /\s/.test(s[j])) j++;
    if (s[j] === '+') { j++; continue; }
    break;
  }
  return { path: out, end: j };
}

// 注意：这里**不要**再用「包含 /fonts/ /common/ /app/ 就当噪音」这类段匹配。
// 我们的候选路径一律以 /api 或 /auth 开头，静态资源段不会出现在这个位置；
// 而 `/api/fonts/youziku/...` 这种**真接口**会被那种规则误杀，导致漏报。
const VERB_CTX = /\.(get|post|put|delete|patch)\s*\(/g;

function normPath(p) {
  return p
    .split('?')[0] // 查询串不是路径身份的一部分
    .replace(/\$\{[^}]*\}/g, '{param}')
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, '');
}

/** 只接受干净的路径：段要么是字面量标识符，要么是 {param} */
function looksLikePath(p) {
  if (!/^\/(api|auth)\//.test(p)) return false;
  return p.split('/').filter(Boolean).every((s) => s === '{param}' || /^[A-Za-z0-9_\-]+$/.test(s));
}

// ---------------------------------------------------------------- 扫 bundle

const bundle = new Map(); // 归一化路径 -> { verbs, files, samples, raws }
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const fname = path.basename(f).slice(0, 40);
  for (const m of src.matchAll(/["'`](\/(?:api|auth)\/[A-Za-z0-9_\-/.$]*)/g)) {
    const literal = m[1];
    if (literal.length < 6) continue;
    const { path: chain } = readConcatChain(src, m.index);
    const raw = chain && chain.length > literal.length ? chain : literal;
    const p = normPath(raw);
    if (!looksLikePath(p)) continue;
    const e = bundle.get(p) || { verbs: new Set(), files: new Set(), samples: [], raws: new Set() };
    const ctx = src.slice(Math.max(0, m.index - 130), m.index + 40);
    const vm = [...ctx.matchAll(VERB_CTX)];
    if (vm.length) e.verbs.add(vm[vm.length - 1][1].toUpperCase());
    e.files.add(fname);
    e.raws.add(raw);
    if (e.samples.length < 2) e.samples.push(src.slice(Math.max(0, m.index - 90), m.index + 170).replace(/\s+/g, ' '));
    bundle.set(p, e);
  }
}

// ---------------------------------------------------------------- 客户端已封装

const clientSrc = fs.readFileSync(CLIENT, 'utf8');
const clientPaths = new Set();
for (const m of clientSrc.matchAll(/this\.request\(\s*['"]([A-Z]+)['"]\s*,\s*/g)) {
  const lit = readString(clientSrc, m.index + m[0].length);
  if (!lit) continue;
  const p = lit.text.trim();
  if (!/^\/(api|auth)\//.test(p)) continue;
  clientPaths.add(normPath(p));
}

const segs = (p) => p.split('/').filter(Boolean);
const isWild = (s) => /^\{.*\}$/.test(s);
/**
 * bundle 路径 B 是否已被客户端路径 C 覆盖：
 *  - 段数相同：逐段比较，`{param}` 当通配（各吃一段）
 *  - C 比 B 长：多出来的尾巴必须全是 `{param}`（客户端把 id 显式写进了路径）
 *  - C 比 B 短：不算覆盖（`/api/teams/{id}` 不能代表 `/api/teams/{id}/members`）
 */
function covers(C, B) {
  const A = segs(C);
  const X = segs(B);
  if (A.length < X.length) return false;
  for (let i = 0; i < X.length; i++) {
    // 客户端通配**不能**吃掉 bundle 里的静态字面量：`/api/forms/{show_id}` 不代表 `/api/forms/export`
    if (isWild(A[i]) && !isWild(X[i])) return false;
    if (!isWild(A[i]) && isWild(X[i])) continue; // 客户端更具体（把 id 写死了），算覆盖
    if (isWild(A[i]) && isWild(X[i])) continue;
    if (A[i] !== X[i]) return false;
  }
  if (A.length === X.length) return true;
  return A.slice(X.length).every(isWild);
}

const fresh = [];
for (const [p, e] of bundle) {
  if ([...clientPaths].some((cp) => covers(cp, p))) continue;
  fresh.push({ path: p, verbs: [...e.verbs].sort(), files: [...e.files], raws: [...e.raws], samples: e.samples });
}
fresh.sort((a, b) => a.path.localeCompare(b.path));

// ---------------------------------------------------------------- 人工判定过的「假阳性」
//
// 客户端用模板串拼路径时（`/api/messages/setting/${kind}/${value}`），
// 段级比对没法把 `{param}` 和字面量 `mute_new_show` 对上，于是会误报。
// 这里把已经人工确认覆盖的形态列出来，输出时单列一节，避免每次都要重新判断一遍。
const KNOWN_COVERED = [
  { re: /^\/api\/messages\/(setting\/)?mute_(new_show|invitation|be_saved_to)\//, why: 'setMute(kind, value) 用模板串拼段' },
  { re: /^\/api\/statistics\/show\/\{param\}\/ranks$/, why: 'showStatistics(show_id, "ranks")' },
  { re: /^\/auth\/(bind_\w+|qq|wechat|weibo|mobile_wechat|email\/login|report\/)/, why: '浏览器入口 URL，客户端用 loginUrl()/bindUrl()/signIn() 产出' },
  { re: /^\/api\/user_home\/tag$/, why: '实测 404，见 homeTags() 注释' },
  { re: /^\/api\/assets\/\{param\}\/tag\/\{param\}$/, why: 'bundle 直译但实测 404；客户端用 POST /api/assets/{id}/tags（tag 在 body），见 addImageTag() 注释' },
];
const actuallyNew = [];
const knownCovered = [];
for (const f of fresh) {
  const hit = KNOWN_COVERED.find((k) => k.re.test(f.path));
  if (hit) knownCovered.push({ ...f, why: hit.why });
  else actuallyNew.push(f);
}

const clientList = [...clientPaths];
const dead = clientList.filter((cp) => ![...bundle.keys()].some((p) => covers(cp, p))).sort();

fs.mkdirSync(CAPTURE_DIR, { recursive: true });
fs.writeFileSync(path.join(CAPTURE_DIR, 'diff_new.json'), JSON.stringify(fresh, null, 2));
fs.writeFileSync(path.join(CAPTURE_DIR, 'diff_dead.json'), JSON.stringify(dead, null, 2));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ scanned: files.length, bundlePaths: bundle.size, clientPaths: clientPaths.size, fresh: actuallyNew, knownCovered, dead }, null, 2));
} else {
  console.log(`扫描 ${files.length} 个文件 · bundle 内接口 ${bundle.size} · 客户端路径 ${clientPaths.size}`);
  console.log(`\n未封装（bundle 有、客户端无）：${actuallyNew.length}`);
  for (const f of actuallyNew) console.log(`  ${(f.verbs.join('/') || '?').padEnd(14)} ${f.path}`);
  if (knownCovered.length) {
    console.log(`\n已确认覆盖、只是路径形状对不上（不需处理）：${knownCovered.length}`);
    for (const f of knownCovered) console.log(`  ${f.path}   ← ${f.why}`);
  }
  console.log(`\n客户端独占（本次 bundle 未出现，需人工确认是否已下线）：${dead.length}`);
  for (const d of dead) console.log('  ' + d);
}
