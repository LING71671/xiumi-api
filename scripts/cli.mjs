#!/usr/bin/env node
/**
 * cli.mjs — 秀米全站操作 CLI
 *
 * 把客户端 399 个方法原样暴露成命令行，外加一个任意接口逃生口。
 * 不做权限拦截 —— 只把「读 / 写 / 不可逆」标出来，由使用者自己判断。
 *
 * 用法：
 *   node scripts/cli.mjs list                     列出全部方法
 *   node scripts/cli.mjs list --write --json      只看写操作，输出 JSON
 *   node scripts/cli.mjs describe listShows       看签名、参数、注释、风险标注
 *   node scripts/cli.mjs call listShows '{"type":"paper","limit":10}'
 *   node scripts/cli.mjs call deleteShow 123456   位置参数按 JSON 解析，失败则当字符串
 *   node scripts/cli.mjs raw GET /api/sys_info
 *   node scripts/cli.mjs login --user 手机号 --pass 密码
 *   node scripts/cli.mjs me
 *
 * 参数规则：位置参数逐个尝试 JSON.parse —— `123` 得数字、`{"a":1}` 得对象、
 * `标签` 解析失败则原样当字符串。要精确表达就用 `--args '[...]'` 直接给数组。
 *
 * 会话默认取 cfg.mjs 的 SESSION_FILE，可用 --session 指定，或先跑 login 落盘。
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, SESSION_FILE, BASE, launchOptions, contextOptions } from './cfg.mjs';
import { loadMeta as parseMeta, riskTag } from './lib/methodmeta.mjs';
import { loadStore, statusOf, summarize, summaryLine, MARK } from './lib/verification.mjs';

const CLIENT = path.join(ROOT, 'client', 'xiumi.mjs');
const CLIENT_URL = pathToFileURL(CLIENT).href;

/** 元数据 + 验证状态合并成一张表（状态只读 data/verification.json） */
async function loadMeta() {
  const Xiumi = await getClient();
  const store = loadStore();
  return (await parseMeta(Xiumi)).map((m) => ({ ...m, status: statusOf(m, store) }));
}

// ---------------------------------------------------------------- 方法元数据
//
// 元数据（签名 / 注释 / 读还是写）与验证状态（跑没跑通）是两码事，分开放：
//   元数据   -> scripts/lib/methodmeta.mjs（静态解析 + 运行时自省）
//   验证状态 -> data/verification.json（只由验证脚本回写，见 scripts/lib/verification.mjs）


// ---------------------------------------------------------------- 参数解析

const VALUE_FLAGS = new Set(['session', 'args', 'user', 'pass', 'area-code', 'query', 'body', 'sid', 'login-url', 'timeout']);
const BOOL_FLAGS = new Set(['json', 'write', 'help', 'h', 'all', 'browser', 'md']);

function parseArgv(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const name = a.slice(2);
    if (BOOL_FLAGS.has(name)) flags[name] = true;
    else if (VALUE_FLAGS.has(name)) {
      const v = argv[i + 1];
      if (v === undefined) throw new Error(`--${name} 需要一个值`);
      flags[name] = (flags[name] === undefined || name === 'query')
        ? v
        : [].concat(flags[name], v);
      i++;
    } else throw new Error(`未知选项：--${name}`);
  }
  return { flags, positional };
}

/** 位置参数：先试 JSON，失败当字符串。这样 `123` 是数字、`标签` 是字符串。 */
function coerce(s) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

function buildArgv(positional, rawArgs) {
  if (rawArgs !== undefined) {
    let arr;
    try {
      arr = JSON.parse(rawArgs);
    } catch (e) {
      throw new Error(`--args 必须是 JSON：${e.message}`);
    }
    if (!Array.isArray(arr)) throw new Error('--args 必须是 JSON 数组，例如 \'["paper",{"limit":10}]\'');
    return arr;
  }
  return positional.map(coerce);
}

// ---------------------------------------------------------------- 输出

function out(v) {
  if (v === undefined) return console.log('undefined');
  if (typeof v === 'string') return console.log(v);
  try {
    console.log(JSON.stringify(v, null, 2));
  } catch {
    console.log(String(v));
  }
}

// ---------------------------------------------------------------- 会话

async function getClient() {
  return (await import(CLIENT_URL)).Xiumi;
}

/** playwright 是可选依赖：装了就能用浏览器登录，没装不影响其它命令 */
async function loadPlaywright() {
  const tried = [];
  for (const mod of ['playwright', 'playwright-core']) {
    try {
      return await import(mod);
    } catch (e) {
      tried.push(`${mod}（${e.code || e.message}）`);
    }
  }
  throw new Error(
    `浏览器登录需要 playwright，当前不可用：\n  ${tried.join('\n  ')}\n` +
      `任选其一：npm i -D playwright   /   改用 --user + --pass   /   改用 --sid <值>`
  );
}

/**
 * 打开有头浏览器让用户自己完成登录（扫码 / 短信 / 账密都行），
 * 然后轮询该 context 的 cookie，抓到 `sid` 就返回。
 * 只读 cookie，不碰页面内容；拿到后立刻关闭浏览器。
 */
async function loginViaBrowser(url, timeoutMs) {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ ...launchOptions, headless: false });
  try {
    const ctx = await browser.newContext(contextOptions);
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    console.log(`已打开浏览器：${url}`);
    console.log('请在里面完成登录（扫码 / 短信 / 账密均可），登录成功后会自动抓取会话。');
    console.log(`等待 sid cookie，最长 ${Math.round(timeoutMs / 1000)} 秒……`);

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      let cookies;
      try {
        cookies = await ctx.cookies(BASE);
      } catch {
        throw new Error('浏览器已被关闭，未拿到 sid');
      }
      const hit = cookies.find((c) => c.name === 'sid' && c.value);
      if (hit) return hit.value;
      await page.waitForTimeout(1000);
    }
    throw new Error('等待超时，未在浏览器里检测到登录成功');
  } finally {
    await browser.close().catch(() => {});
  }
}

async function loadApi(sessionFile) {
  const f = sessionFile || SESSION_FILE;
  if (!fs.existsSync(f)) {
    throw new Error(
      `找不到会话文件：${f}\n` +
        `先登录一次：node scripts/cli.mjs login --user <账号> --pass <密码>\n` +
        `或用 --session <路径> 指定，或设 XIUMI_USER / XIUMI_PASS 环境变量。`
    );
  }
  const Xiumi = await getClient();
  return Xiumi.loadSession(f);
}

// ---------------------------------------------------------------- 命令

const USAGE = `xiumi — 秀米全站操作 CLI

用法：
  xiumi list [--write] [--json]        列出方法（--write 只看写操作）
  xiumi describe <方法名>               签名、参数、注释、风险标注
  xiumi call <方法名> [参数...]          调用（位置参数按 JSON 解析）
  xiumi call <方法名> --args '[...]'    精确传参（JSON 数组 = 位置参数列表）
  xiumi raw <GET|POST|...> <路径>       直接打任意接口
  xiumi login --user <账号> --pass <密码>   账密登录（纯 HTTP）
  xiumi login --browser                     打开浏览器手动登录，自动抓 sid
  xiumi login --sid <值>                    直接给 sid（值写 - 则从 stdin 读）
  xiumi me                             当前账号

选项：
  --session <路径>   会话文件（默认 capture/client-session.json）
  --json             list 输出 JSON
  --user / --pass / --area-code    login 用；也可用 XIUMI_USER / XIUMI_PASS
  --login-url <url>  --browser 时打开的页面（默认 https://xiumi.us/auth）
  --timeout <秒>     --browser 的等待上限（默认 300）
  --query k=v        raw 的查询参数，可重复
  --body '<json>'    raw 的请求体
  -h, --help         显示本帮助

参数规则：位置参数逐个尝试 JSON.parse（123 → 数字，{"a":1} → 对象，
解析失败 → 原样字符串）。要精确表达用 --args 给 JSON 数组。
`;

async function main() {
  const { flags, positional } = parseArgv(process.argv.slice(2));
  const cmd = positional.shift();

  if (!cmd || flags.help || flags.h) {
    console.log(USAGE);
    return 0;
  }

  if (cmd === 'list') {
    const meta = (await loadMeta()).filter((m) => (flags.write ? m.write : true));

    if (flags.md) {
      const brief = (d) => (d ? d.split(/。|\.\s/)[0].replace(/^\[[^\]]*\]\s*/, '').slice(0, 72) : '');
      const cell = (s) => String(s).replace(/\|/g, '\\|');
      const table = (ms) => {
        const rows = ms
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((m) => `| \`${m.name}\` | \`${cell(m.args) || '—'}\` | ${riskTag(m)} | ${m.status.label} | ${cell(brief(m.doc))} |`);
        return ['| 方法 | 签名 | 类型 | 验证状态 | 说明 |', '|---|---|---|---|---|', ...rows].join('\n');
      };
      const statics = meta.filter((m) => m.isStatic);
      const reads = meta.filter((m) => !m.isStatic && !m.write);
      const writes = meta.filter((m) => !m.isStatic && m.write);
      const sum = summarize(meta, loadStore());
      console.log(
        [
          '# 全站方法目录',
          '',
          `> 由 \`node scripts/cli.mjs list --md\` 生成，共 **${meta.length}** 个方法`,
          `> （静态 ${statics.length} / 读 ${reads.length} / 写 ${writes.length}）。`,
          '>',
          '> 「类型」由源码静态推断：**读** / **写**。「删除/清空」「资金」「账号凭据」「修改」',
          '> 是命名启发式标注，**只作提示**——哪些操作代价高由你自己判断，工具不做任何拦截。',
          '>',
          '> 「验证状态」只读 `data/verification.json`，**由验证脚本回写**，不由人记：',
          `> ${summaryLine(sum)}`,
          '> `✅`=语义已验证（写后有回读断言） `🟡`=调用被服务端受理但无可观测回读字段。',
          '> 逐方法证据链见 [`COVERAGE.md`](./COVERAGE.md)。',
          '>',
          '> 调用方式见 [`../README.md`](../README.md)：`xiumi call <方法> [参数...]`。',
          '',
          '## 静态方法（登录 / 载入会话）',
          '',
          table(statics),
          '',
          `## 读操作（${reads.length}）`,
          '',
          table(reads),
          '',
          `## 写操作（${writes.length}）`,
          '',
          table(writes),
          '',
        ].join('\n')
      );
      return 0;
    }

    if (flags.json) {
      out(meta);
      return 0;
    }
    const groups = new Map();
    const bucket = (m) =>
      /^(get|list|read|fetch|show|is|has|search)/.test(m.name) ? '读' : m.write ? '写' : '其它';
    for (const m of meta) {
      const g = bucket(m);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(m);
    }
    console.log(`${meta.length} 个方法${flags.write ? '（仅写操作）' : ''}\n`);
    const sum = summarize(meta, loadStore());
    console.log(`验证状态：${summaryLine(sum)}\n`);
    for (const g of ['读', '写', '其它']) {
      const ms = groups.get(g);
      if (!ms) continue;
      console.log(`--- ${g}（${ms.length}）`);
      for (const m of ms) console.log(`  ${m.name.padEnd(34)} ${riskTag(m).padEnd(22)} ${m.status.label}`);
      console.log('');
    }
    console.log('详情：xiumi describe <方法名>');
    return 0;
  }

  if (cmd === 'describe') {
    const name = positional[0];
    if (!name) throw new Error('用法：xiumi describe <方法名>');
    const meta = await loadMeta();
    const m = meta.find((x) => x.name === name);
    if (!m) {
      const near = meta.filter((x) => x.name.toLowerCase().includes(name.toLowerCase())).slice(0, 8);
      throw new Error(
        `没有这个方法：${name}` +
          (near.length ? `\n你是不是要找：${near.map((x) => x.name).join(', ')}` : '')
      );
    }
    console.log(`${m.name}${m.isStatic ? '（静态）' : ''}${m.accessor ? `（${m.accessor} 访问器）` : ''}`);
    console.log('─'.repeat(60));
    console.log(`签名   ${m.args || '(无参数)'}`);
    console.log(`类型   ${riskTag(m)}`);
    console.log(`状态   ${m.status.label}`);
    const ev = m.status.entry?.last;
    if (ev) {
      console.log(`        证据 ${ev.script} · ${ev.case} · ${ev.at}${ev.ms != null ? ` · ${ev.ms}ms` : ''}`);
      if (ev.note) console.log(`        备注 ${ev.note}`);
      if (ev.error) console.log(`        错误 ${ev.error}`);
      if (m.status.entry.everVerified && !ev.ok) console.log(`        历史上通过于 ${m.status.entry.firstVerifiedAt}`);
    } else if (m.hintUntested) {
      console.log('        仅源码声明未实测，无脚本证据 —— 状态由 scripts/ 下的验证脚本回写');
    }
    if (m.doc) console.log(`说明   ${m.doc.slice(0, 400)}`);
    console.log('─'.repeat(60));
    const sample = positional.slice(1);
    console.log(`调用   xiumi call ${m.name}${sample.length || flags.args ? ' ' + (sample.join(' ') || "<--args '[...]'>") : ''}`);
    return 0;
  }

  if (cmd === 'call' || cmd === 'raw') {
    const name = positional.shift();
    if (!name) throw new Error(`用法：xiumi ${cmd} <方法名|HTTP方法> [参数...]`);
    const args = buildArgv(positional, flags.args);

    if (cmd === 'raw') {
      const api = await loadApi(flags.session);
      const query = {};
      for (const kv of [].concat(flags.query || [])) {
        const i = kv.indexOf('=');
        if (i < 0) throw new Error(`--query 需要 k=v 形式：${kv}`);
        query[kv.slice(0, i)] = kv.slice(i + 1);
      }
      const body = flags.body ? JSON.parse(flags.body) : undefined;
      out(await api.request(name.toUpperCase(), args[0], { query, body }));
      return 0;
    }

    if (name === 'login' || name === 'static') {
      throw new Error('login 是静态方法，请直接用 `xiumi login` 子命令。');
    }

    const meta = (await loadMeta()).find((x) => x.name === name);
    if (!meta) throw new Error(`没有这个方法：${name}（xiumi list 看全部）`);
    if (meta.risks.length) {
      console.error(`[${riskTag(meta)}] ${name} —— 风险标注仅是提示，请自行确认操作对象。`);
    }

    const api = await loadApi(flags.session);
    if (typeof api[name] !== 'function') throw new Error(`${name} 不是可调用的方法`);
    out(await api[name](...args));
    return 0;
  }

  if (cmd === 'login') {
    const Xiumi = await getClient();
    const f = flags.session || SESSION_FILE;
    let api;

    if (flags.browser) {
      const url = flags['login-url'] || `${BASE}/auth`;
      const timeoutMs = Number(flags.timeout || 300) * 1000;
      api = new Xiumi({ sid: await loginViaBrowser(url, timeoutMs) });
    } else if (flags.sid) {
      const sid = flags.sid === '-' ? fs.readFileSync(0, 'utf8').trim() : String(flags.sid);
      if (!sid) throw new Error('--sid 为空');
      api = new Xiumi({ sid });
    } else {
      const user = flags.user || process.env.XIUMI_USER;
      const pass = flags.pass || process.env.XIUMI_PASS;
      if (!user || !pass) {
        throw new Error(
          '登录需要三种方式之一：\n' +
            '  --user <账号> --pass <密码>   账密登录（纯 HTTP；命中风控会要求验证码）\n' +
            '  --browser                     打开浏览器手动登录，自动抓 sid\n' +
            '  --sid <值>                    直接给 sid（值写 - 则从 stdin 读）'
        );
      }
      const areaCode = flags['area-code'] ? Number(flags['area-code']) : 86;
      api = await Xiumi.login({ user, password: pass, areaCode });
    }

    // 保留既有会话里的账密：`--sid` / `--browser` 登录时实例上没有它们，
    // 直接 saveSession 会把原本存着的账密写成 null，sid 失效后就没法自动重登了。
    try {
      const prev = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!api.user && prev.user) api.user = prev.user;
      if (!api.password && prev.password) api.password = prev.password;
    } catch {
      /* 首次登录或文件损坏，忽略 */
    }

    let me;
    try {
      me = await api.me();
    } catch (e) {
      throw new Error(`会话校验失败（sid 可能已失效或不是登录态）：${e.message}`);
    }
    fs.mkdirSync(path.dirname(f), { recursive: true });
    await api.saveSession(f);
    console.log(`已登录：${me.nickname}（${String(me.unique_uid).slice(0, 8)}…）`);
    console.log(`会话已保存 -> ${f}`);
    return 0;
  }

  if (cmd === 'me') {
    const api = await loadApi(flags.session);
    out(await api.me());
    return 0;
  }

  throw new Error(`未知命令：${cmd}\n\n${USAGE}`);
}

main().then(
  (code) => process.exit(code || 0),
  (e) => {
    console.error(`错误：${e.message}`);
    process.exit(1);
  }
);
