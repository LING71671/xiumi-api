// client.test.mjs — 客户端离线单测（node:test，不联网）
//
// 目的：把「不连服务器也能证伪」的东西锁死 —— 请求语义、类型路由、包体签名、目录口径。
// 这些恰恰是旧版出过 bug 的地方（save() 把 tablet 建成 paper、会话过期静默返回 HTML、
// 「399 个方法」里混着访问器别名），而它们全都不需要真账号就能测。
//
// 跑：npm test   或   node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Xiumi, XiumiError, emptyShow, inferShowType, wrapShowData, unwrapShowData, makeSavingToken,
} from '../client/xiumi.mjs';
import { loadMeta } from '../scripts/lib/methodmeta.mjs';

/** 造一个记录调用、按脚本回话的假 fetch */
function mockFetch(handler) {
  const calls = [];
  const fn = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || 'GET', body: opts.body, headers: opts.headers || {} });
    return handler(String(url), opts, calls.length);
  };
  fn.calls = calls;
  return fn;
}

const jsonRes = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
const htmlRes = (html = '<!doctype html><html>login</html>', status = 200) =>
  new Response(html, { status, headers: { 'content-type': 'text/html' } });

// ---------------------------------------------------------------- 请求语义

test('envelope：四个成功码都算成功，返回 data', async () => {
  for (const code of [0, 1, 2, 3]) {
    const f = mockFetch(() => jsonRes({ code, message: 'x', data: { ok: code } }));
    const api = new Xiumi({ sid: 's', fetchImpl: f });
    assert.deepEqual(await api.request('GET', '/api/whatever'), { ok: code });
  }
});

test('envelope：业务错误码抛 XiumiError 并带 code', async () => {
  const f = mockFetch(() => jsonRes({ code: 5, message: 'Common:Failed_DataRejected' }));
  const api = new Xiumi({ sid: 's', fetchImpl: f });
  await assert.rejects(api.request('POST', '/api/shows/v5/paper'), (e) => {
    assert.ok(e instanceof XiumiError);
    assert.equal(e.code, 5);
    assert.match(e.message, /Failed_DataRejected/);
    return true;
  });
});

test('会话过期：302 跳登录页 → expired=true（不再静默返回 HTML）', async () => {
  const f = mockFetch(() => new Response('', { status: 302, headers: { location: '/auth' } }));
  const api = new Xiumi({ sid: 'dead', fetchImpl: f });
  await assert.rejects(api.request('GET', '/api/shows'), (e) => {
    assert.equal(e.expired, true);
    assert.match(e.message, /会话无效或已过期/);
    return true;
  });
});

test('会话过期：200 返回登录页 HTML → expired=true', async () => {
  const f = mockFetch(() => htmlRes());
  const api = new Xiumi({ sid: 'dead', fetchImpl: f });
  await assert.rejects(api.request('GET', '/api/shows'), (e) => {
    assert.equal(e.expired, true);
    assert.match(e.message, /HTML/);
    return true;
  });
});

test('OAuth/邮件回调页本来就返回 HTML：不能当成会话过期', async () => {
  const f = mockFetch(() => htmlRes('<html><body>授权成功</body></html>'));
  const api = new Xiumi({ sid: 'ok', fetchImpl: f });
  // 走封装方法（内部带 expectHtml）
  assert.match(await api.authSuccess(), /授权成功/);
  assert.match(await api.emailLoginSuccess(), /授权成功/);
  assert.match(await api.reportResult(true), /授权成功/);
  // 直接 request 也在白名单里
  assert.match(await api.request('GET', '/auth/success'), /授权成功/);
  // 但普通 API 路径仍按过期处理
  await assert.rejects(api.request('GET', '/api/user/info'), /HTML/);
});

test('未登录码 -102 也标 expired', async () => {
  const f = mockFetch(() => jsonRes({ code: -102, message: 'Auth:Failed_NotLogin' }, 401));
  const api = new Xiumi({ sid: '', fetchImpl: f });
  await assert.rejects(api.request('GET', '/api/shows'), (e) => {
    assert.equal(e.expired, true);
    return true;
  });
});

test('正常的非 JSON 文本响应原样返回（不是所有非 JSON 都是错误）', async () => {
  const f = mockFetch(() => new Response('Deleted', { status: 200 }));
  const api = new Xiumi({ sid: 's', fetchImpl: f });
  assert.equal(await api.request('DELETE', '/api/shows/1'), 'Deleted');
});

test('query：undefined 不出现，null 变成空值参数', async () => {
  const f = mockFetch(() => jsonRes({ code: 0, data: {} }));
  const api = new Xiumi({ sid: 's', fetchImpl: f });
  await api.request('GET', '/api/shows/all/tags', { query: { team_id: undefined, include: null, limit: 0 } });
  const url = f.calls[0].url;
  assert.ok(!url.includes('team_id'), `不该带 team_id：${url}`);
  assert.ok(url.includes('include='), `include 应为空值：${url}`);
  assert.ok(url.includes('limit=0'));
});

test('重试：GET 遇 503 会退避重试，POST 不重试', async () => {
  const getF = mockFetch((url, opts, n) => (n < 3 ? jsonRes({ code: 0, data: { attempt: n } }, 503) : jsonRes({ code: 0, data: { attempt: n } })));
  const get = new Xiumi({ sid: 's', fetchImpl: getF, retry: 2 });
  assert.deepEqual(await get.request('GET', '/api/sys_info'), { attempt: 3 });
  assert.equal(getF.calls.length, 3);

  const postF = mockFetch(() => jsonRes({ code: 0, data: {} }, 503));
  const post = new Xiumi({ sid: 's', fetchImpl: postF, retry: 2 });
  await assert.rejects(post.request('POST', '/api/shows/v5/paper', { body: {} }));
  assert.equal(postF.calls.length, 1, '写请求重放可能造成重复创建，必须只发一次');
});

test('超时：AbortSignal 生效并抛 XiumiError（不重试写请求）', async () => {
  const f = mockFetch(async () => {
    const e = new Error('The operation was aborted due to timeout');
    e.name = 'TimeoutError';
    throw e;
  });
  const api = new Xiumi({ sid: 's', fetchImpl: f, timeout: 50, retry: 0 });
  await assert.rejects(api.request('POST', '/api/x', { body: {} }), /超时 50ms/);
});

// ---------------------------------------------------------------- 类型路由（旧 bug 回归）

test('save()：四种类型都 POST 到正确的 show_type 路径', async () => {
  for (const type of ['paper', 'tablet', 'booklet', 'placard']) {
    const f = mockFetch((url) => {
      if (url.includes('/auth/me')) {
        return jsonRes({ code: 0, data: { user: { unique_uid: 'u'.repeat(32), user_sid: 's'.repeat(32) } } });
      }
      return jsonRes({ code: 1, data: { show_id: 1 } });
    });
    const api = new Xiumi({ sid: 'x', fetchImpl: f });
    await api.save(api.buildShow(type, 'T'));
    const post = f.calls.find((c) => c.method === 'POST');
    assert.ok(post, `${type} 没有发出 POST`);
    assert.match(post.url, new RegExp(`/api/shows/v5/${type}$`), `${type} 打到了 ${post.url}`);
  }
});

test('save()：显式 type 覆盖推断', async () => {
  const f = mockFetch((url) => (url.includes('/auth/me')
    ? jsonRes({ code: 0, data: { user: { unique_uid: 'u' } } })
    : jsonRes({ code: 1, data: {} })));
  const api = new Xiumi({ sid: 'x', fetchImpl: f });
  await api.save(api.buildShow('paper', 'T'), undefined, { type: 'tablet' });
  assert.match(f.calls.find((c) => c.method === 'POST').url, /\/api\/shows\/v5\/tablet$/);
});

test('inferShowType：scene 相同但 viewport/targetContext 不同要分清', () => {
  assert.equal(inferShowType(emptyShow('paper')), 'paper');
  assert.equal(inferShowType(emptyShow('tablet')), 'tablet');
  assert.equal(inferShowType(emptyShow('booklet')), 'booklet');
  assert.equal(inferShowType(emptyShow('placard')), 'placard');
  assert.throws(() => inferShowType({}), XiumiError);
});

test('inferShowType：区分不开时抛错，不猜（paper/tablet 只差 targetContext）', () => {
  // 缺 targetContext：旧实现会静默当 tablet 建到 /api/shows/v5/tablet
  assert.throws(() => inferShowType({ scene: 'flw.vertical.one-page' }), /targetContext/);
  assert.throws(() => inferShowType({ scene: 'flw.vertical.one-page', targetContext: 'unknown' }), /targetContext/);
  // 已知组合仍正常
  assert.equal(inferShowType({ scene: 'flw.vertical.one-page', targetContext: 'xiumi' }), 'tablet');
  assert.equal(inferShowType({ scene: 'flw.vertical.one-page', targetContext: 'wechat' }), 'paper');
});

// ---------------------------------------------------------------- 作品数据包

test('wrapShowData：format / 三个 appendix / signature 形状', () => {
  const w = wrapShowData({ title: '标题' }, 'u'.repeat(32));
  assert.equal(w.format, 'c444c492de13eb854a687b3361bef8c4');
  assert.match(w.signature, /^[0-9a-f]{32}$/);
  const data = unwrapShowData(w.encodedData);
  assert.equal(data.title, '标题');
  // _1 = n[0..8] + md5[8..]（定长 32）；_2 = md5[0..8] + n[8..]（长度随 Date.now() 位数走）
  assert.match(data.desc_appendix_1, /^[0-9a-f]{32}$/);
  assert.match(data.desc_appendix_2, /^[0-9a-f]{8}\d*$/);
  assert.equal(data.desc_appendix_2.length, String(Date.now()).length);
  assert.ok(/^\d+$/.test(data.desc_appendix_3));
});

test('makeSavingToken：md5 形状', () => {
  assert.match(makeSavingToken(), /^[0-9a-f]{32}$/);
});

test('字符串往返：lz-string 实现能吃自己的输出（含中文与 emoji）', () => {
  const s = '标题\u4e2d\u6587'.repeat(30) + '\u{1F600}';
  const data = unwrapShowData(wrapShowData({ title: s }, 'u').encodedData);
  assert.equal(data.title, s);
});

// ---------------------------------------------------------------- 目录口径

test('方法目录：不含访问器别名与内部实现，且规模符合预期', async () => {
  const metas = await loadMeta(Xiumi);
  const names = new Set(metas.map((m) => m.name));
  for (const n of ['get', 'post', 'put', 'del', '_send', '_me']) {
    assert.ok(!names.has(n), `目录里不该有 ${n}`);
  }
  assert.ok(names.has('login') && names.has('loadSession'), '静态方法要在目录里');
  // 下限不是精确断言：方法数随「补接口」的 PR 增长（当前 394 → 后续 443），
  // 这里只防「目录被解析成空/半截」这类回归。
  assert.ok(metas.length >= 380, `方法数异常：${metas.length}`);
  // 写操作判定：包装器调用了写方法也要算写（renameShow → updateShow）
  const rename = metas.find((m) => m.name === 'renameShow');
  assert.equal(rename.write, true, 'renameShow 内部走 updateShow，必须标写成写');
});

test('源码里不许有同名方法（后定义会静默覆盖前一个）', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../client/xiumi.mjs', import.meta.url), 'utf8');
  // 只认「行首两个空格 + 方法名(」的类成员写法，跳过 if/for/constructor 这类
  const re = /^  (?:(?:static|async)\s+)?(?:(?:get|set)\s+)?([a-zA-Z_$][\w$]*)\s*\(/gm;
  const seen = new Map();
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    if (['if', 'for', 'while', 'switch', 'catch', 'constructor', 'return', 'function'].includes(name)) continue;
    const line = src.slice(0, m.index).split('\n').length;
    if (!seen.has(name)) seen.set(name, []);
    seen.get(name).push(line);
  }
  const dupes = [...seen].filter(([, lines]) => lines.length > 1);
  assert.deepEqual(dupes, [], `存在重复定义：${dupes.map(([n, l]) => `${n}@${l.join('/')}`).join(', ')}`);
});
