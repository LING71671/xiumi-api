/**
 * xiumi.mjs — 秀米（xiumi.us）非官方 API 客户端
 *
 * 零依赖（Node 18+，用内置 fetch）。一份 `sid` 会话即可调用全站接口。
 *
 * 快速开始：
 *   import { Xiumi } from './xiumi.mjs';
 *   const api = await Xiumi.login({ user: '手机号', password: '密码' });
 *   console.log(await api.me());
 *   console.log(await api.listShows({ type: 'paper' }));
 *
 * 会话可用 3 天（服务端声明），建议落盘复用：
 *   await api.saveSession('./session.json');
 *   const api2 = await Xiumi.loadSession('./session.json');
 */
import { createHash } from 'node:crypto';
import { compressToBase64, decompressFromBase64 } from './lz-string.mjs';

export const BASE = 'https://xiumi.us';
const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/** 作品数据包格式标识（编辑器 compressUtil 中的常量） */
export const FORMAT_SHOW = 'c444c492de13eb854a687b3361bef8c4';
export const FORMAT_RAW = '0320cc2e241eb9af530b84dbe0b1cc65';

function md5(s) {
  return createHash('md5').update(s, 'utf8').digest('hex');
}

/** envelope 中的成功码：0 Common:OK / 1 Common:Created / 2 Common:Updated / 3 Common:Deleted */
const OK_CODES = new Set([0, 1, 2, 3]);

/**
 * 排序类接口（tags/order、tagsorder）的 `order` 字段服务端只认**字符串**，
 * 传数组会报 `Common:Failed: "arguments[2]" must be of type "string | Buffer"`。
 * 这里统一收口：数组 → JSON 字符串，字符串原样透传。
 */
function asOrder(order) {
  if (order === undefined || order === null) return '';
  return typeof order === 'string' ? order : JSON.stringify(order);
}

// ---------------------------------------------------------------- 作品骨架模板
//
// 来源：编辑器 bundle 的 `depot/services/showDataGenerator` 工厂。
// 这是「从零构造页面」的唯一正确来源 —— 手写组件结构会被服务端以
// Common:Failed_DataRejected 拒掉，必须用站内自己的空模板。

const VIEWPORT_FLOW_SCROLL = { STAGE_SIZE: 'flow_scroll', WIDTH: 415, FONT_SIZE: 16 };
const VIEWPORT_BOARD_FIT = { STAGE_SIZE: 'board_fit', WIDTH: 415, FONT_SIZE: 16 };
const VIEWPORT_BOARD_SPREAD = { STAGE_SIZE: 'board_spread', WIDTH: 750, FONT_SIZE: 16 };

/** 与编辑器的 cloneCompForImporting 等价的深拷贝 + 重新分配 _$uuid */
export function cloneComp(node) {
  const c = JSON.parse(JSON.stringify(node));
  const reuuid = (n) => {
    if (Array.isArray(n)) { n.forEach(reuuid); return; }
    if (n && typeof n === 'object') {
      if (n._comp && typeof n._comp === 'object') n._comp._$uuid = newCompUuid();
      for (const v of Object.values(n)) reuuid(v);
    }
  };
  reuuid(c);
  return c;
}

let _uuidSeq = 0;
export function newCompUuid() {
  const t = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 16; i++) s += t[Math.floor(Math.random() * t.length)];
  return `comp-${s}${(_uuidSeq++ % 64).toString(36)}`;
}

const TPL = {
  booklet: {
    prefix: 'booklet', page: 'booklet-cp:sys/pg-fs', layer: 'booklet-cp:sys/ly-fs',
    cube: 'booklet-cp:sys/cube-fs', mode: 'paging', scene: 'fs.vertical.paging',
    viewport: VIEWPORT_BOARD_SPREAD, targetContext: 'xiumi', systemTitle: false,
  },
  paper: {
    prefix: 'paper', page: 'paper-cp:sys/pg-flw', layer: 'paper-cp:sys/ly-flw',
    cube: 'paper-cp:sys/cube-fs', mode: 'flow', scene: 'flw.vertical.one-page',
    viewport: VIEWPORT_FLOW_SCROLL, targetContext: 'wechat', systemTitle: true,
  },
  tablet: {
    prefix: 'tablet', page: 'tablet-cp:sys/pg-flw', layer: 'tablet-cp:sys/ly-flw',
    cube: 'tablet-cp:sys/cube-fs', mode: 'flow', scene: 'flw.vertical.one-page',
    viewport: VIEWPORT_FLOW_SCROLL, targetContext: 'xiumi', systemTitle: true,
  },
  placard: {
    prefix: 'placard', page: 'placard-cp:sys/pg-fs', layer: 'placard-cp:sys/ly-fs',
    cube: 'placard-cp:sys/cube-fs', mode: 'paging', scene: 'fs.vertical.paging',
    viewport: VIEWPORT_BOARD_FIT, targetContext: 'xiumi', systemTitle: false,
  },
};

export const SHOW_TYPES = Object.keys(TPL);

/** 空白作品骨架（showDataGenerator.initializedShow 的等价物） */
export function emptyShow(type = 'paper', title = '无标题') {
  const t = TPL[type];
  if (!t) throw new XiumiError(`不支持的作品类型：${type}（可用：${SHOW_TYPES.join('/')}）`);
  return {
    version: '2.0',
    title,
    desc: null,
    cover: null,
    backgroundMusic: null,
    displaySystemTitle: t.systemTitle,
    displaySystemPageMargins: t.systemTitle,
    displaySystemCatalogue: true,
    scene: t.scene,
    viewport: { ...t.viewport },
    targetContext: t.targetContext,
    cubes: [],
  };
}

/** 空图层 */
export function emptyLayer(type = 'paper') {
  const t = TPL[type];
  return {
    _comp: { tplId: t.layer, constraint: { role: 'layer' } },
    comps: { type: 'group', constraint: { childLayout: 'static' }, items: [] },
    _qiBlock: { type: 'group', constraint: { childLayout: 'static', frozen: true }, items: [] },
  };
}

/** 空页面（已带一个空图层） */
export function emptyPage(type = 'paper') {
  const t = TPL[type];
  return {
    _comp: {
      tplId: t.page,
      constraint: { role: 'page', mode: t.mode, scene: null, viewport: { ...t.viewport } },
      style: { backgroundColor: 'tn-default-color' },
    },
    layers: [emptyLayer(type)],
  };
}

/** 空 cube（pages / grounds / overlaps 三个平行数组） */
export function emptyCube(type = 'paper') {
  const t = TPL[type];
  return {
    _comp: {
      tplId: t.cube,
      constraint: { role: 'cube', flippingEffect: 'cube.fs.h.sliding' },
      style: { backgroundColor: 'tn-default-color' },
    },
    pages: [],
    grounds: [],
    overlaps: [],
  };
}

/** 背景层（ground）。
 *  注意：图文（paper）自己**没有** emptyGround，站内统一拿 booklet 的页模板当背景层，
 *  只是把 constraint.role 改成 "ground"。这与实测数据一致。 */
export function emptyGround() {
  return cloneComp({
    _comp: {
      tplId: 'booklet-cp:sys/pg-fs',
      constraint: {
        role: 'ground', mode: 'board', scene: null,
        viewport: { STAGE_SIZE: 'board_spread', WIDTH: 375, HEIGHT: 563, FONT_SIZE: 16 },
        flippingEffect: null,
      },
      style: { backgroundColor: 'tn-default-color' },
    },
    layers: [{
      _comp: { tplId: 'booklet-cp:sys/ly-fs', constraint: { role: 'layer' } },
      comps: { type: 'group', constraint: { childLayout: 'static' }, items: [] },
      _qiBlock: { type: 'group', constraint: { childLayout: 'static', frozen: true }, items: [] },
    }],
  });
}

/** 纯文本组件（结构取自站内真实作品，可直接放进 layer.comps.items） */
export function textComp(html, { tplId = 'paper-cp:header/1-txt-normal', textAlign = 'justify' } = {}) {
  return cloneComp({
    _comp: {
      tplId,
      constraint: { opMenu: { 'text-merged': true }, pose: { resize: 'h' } },
      pose: { position: 'static', width: null, height: null },
      style: {},
      _$uuid: 'PLACEHOLDER',
    },
    txt1: { type: 'text', text: html, style: { textAlign }, constraint: {} },
  });
}

/**
 * 图片组件（手写路径）。
 *
 * ⚠️ **优先用 `Xiumi.templateComp('paper-cp:image/001-img-center', c => { c.img1.src = url })`。**
 * 这个函数只重建了 matrix 的一部分（`_comp` + `img1`），字段不全，
 * 实测图片会被渲染器退化成占位图。保留它是为了有需要时手改，不是推荐入口。
 *
 * 另注意 tplId 的两种身份：
 *   - atom_tpl_id      = `paper-cp:image/001-img-center`（请求模板库用）
 *   - matrix._comp.tplId = `paper-cp:image/img-autowidth`（实例化后落库用）
 * 这里给的是后者。
 */
export function imageComp(src, { tplId = 'paper-cp:image/img-autowidth', textAlign = 'center' } = {}) {
  return cloneComp({
    _comp: {
      tplId,
      constraint: { opMenu: { 'crop-image-merged': true }, pose: { resize: 'h' } },
      pose: { position: 'static', width: null, height: null },
      style: { textAlign, marginTop: '10px', marginBottom: '10px' },
      link: null,
      linkFrame: false,
      anim: null,
    },
    img1: { type: 'image', src, alt: '', style: {}, link: null, linkFrame: false, anim: null, constraint: {} },
  });
}

/**
 * 把作品数据包成编辑器同款请求体。
 * 编辑器源码（compressUtil.wrapData）逻辑：
 *   n = Date.now();  r = round(1e6*random())
 *   i = md5([r, uid, n].join('$$'));   signature = md5([n, uid, r].join('$$'))
 *   desc_appendix_1 = n[0..8] + i[8..];  _2 = i[0..8] + n[8..];  _3 = r
 *   encodedData = LZString.compressToBase64(JSON.stringify(show))
 * @param {object} show 作品数据对象
 * @param {string} uniqueUid 当前账号的 unique_uid
 */
export function wrapShowData(show, uniqueUid) {
  const n = Date.now().toString();
  const r = Math.round(1e6 * Math.random()).toString();
  const i = md5([r, uniqueUid, n].join('$$'));
  const signature = md5([n, uniqueUid, r].join('$$'));
  const data = { ...show };
  data.desc_appendix_1 = n.slice(0, 8) + i.slice(8);
  data.desc_appendix_2 = i.slice(0, 8) + n.slice(8);
  data.desc_appendix_3 = r;
  return { format: FORMAT_SHOW, encodedData: compressToBase64(JSON.stringify(data)), signature };
}

/** raw_info_only 模式的请求体（不做附录签名）—— 用于「拷贝」这类只传元信息的动作 */
export function wrapRawShowData(show) {
  const data = { ...show, raw_info_only: true };
  return { format: FORMAT_RAW, encodedData: compressToBase64(JSON.stringify(data)) };
}

/**
 * showsManager 初始化时生成的 savingToken：
 *   uuidLike = hex4 x8 拼成 UUID 形状；seed = uuidLike + '.' + Date.now()
 *   savingToken = md5(seed)
 */
export function makeSavingToken() {
  const h4 = () => (Math.floor(65536 * (1 + Math.random()))).toString(16).substring(1);
  const uuidLike = [h4() + h4(), h4(), h4(), h4(), h4() + h4() + h4()].join('-');
  return md5(`${uuidLike}.${Date.now()}`);
}

/** 解出 encodedData 里的作品数据对象 */
export function unwrapShowData(encodedData) {
  const json = decompressFromBase64(encodedData);
  if (!json) throw new XiumiError('encodedData 解码失败');
  return JSON.parse(json);
}

export class XiumiError extends Error {
  constructor(message, { code, status, path } = {}) {
    super(message);
    this.name = 'XiumiError';
    this.code = code;
    this.status = status;
    this.path = path;
  }
}

export class Xiumi {
  /** @param {{sid?: string, user?: string, password?: string}} opts */
  constructor({ sid, user, password, areaCode = 86, base = BASE, ua = DEFAULT_UA, fetchImpl } = {}) {
    this.sid = sid || null;
    this.user = user || null;
    this.password = password || null;
    this.areaCode = areaCode;
    this.base = base;
    this.ua = ua;
    this._fetch = fetchImpl || globalThis.fetch;
    if (!this._fetch) throw new Error('需要 Node 18+ 的内置 fetch，或传入 fetchImpl');
  }

  // ---------------------------------------------------------------- 会话

  /** 账密登录。返回已持有会话的实例。 */
  static async login({ user, password, areaCode = 86, ...rest }) {
    const api = new Xiumi({ user, password, areaCode, ...rest });
    await api.signIn();
    return api;
  }

  static async loadSession(file, opts = {}) {
    const fs = await import('node:fs/promises');
    const j = JSON.parse(await fs.readFile(file, 'utf8'));
    return new Xiumi({ sid: j.sid, user: j.user, password: j.password, ...opts });
  }

  async saveSession(file) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(file, JSON.stringify({ sid: this.sid, user: this.user, password: this.password, savedAt: new Date().toISOString() }, null, 2));
  }

  /** 是否需要验证码（风险控制触发时为 true） */
  async needCaptcha(user = this.user) {
    const r = await this.request('GET', '/api/auth/login-captcha', { query: { area_code: this.areaCode, username: user } });
    return r === true;
  }

  async signIn() {
    if (!this.user || !this.password) throw new Error('缺少 user / password');
    const body = new URLSearchParams({ area_code: String(this.areaCode), email: this.user, password: this.password });
    const res = await this._fetch(`${this.base}/auth/email/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: this.base,
        Referer: `${this.base}/auth`,
        'User-Agent': this.ua,
      },
      body,
    });
    // 成功: 302 + Set-Cookie: sid=...
    const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
    const sidCookie = setCookie.map((c) => c.split(';')[0]).find((c) => c.startsWith('sid='));
    if (!sidCookie) {
      throw new XiumiError('登录失败：未拿到 sid（可能是密码错误或触发了验证码）', { status: res.status });
    }
    this.sid = sidCookie.slice(4);
    try {
      await this.me();
    } catch (e) {
      throw new XiumiError(`登录后校验失败：${e.message}`, { code: e.code, status: e.status });
    }
    return this;
  }

  async signOut() {
    await this.request('GET', '/auth/logout').catch(() => {});
    this.sid = null;
    this._user = null;
  }

  // ---------------------------------------------------------------- 通用请求

  /**
   * 调用任意接口。
   * @param {'GET'|'POST'|'PUT'|'DELETE'|'PATCH'} method
   * @param {string} path 形如 '/api/shows'
   * @param {{query?:object, body?:object, form?:object, raw?:boolean, headers?:object}} [opts]
   * @returns {Promise<any>} 默认返回 envelope.data；raw=true 时返回 {code,message,data,status}
   */
  async request(method, path, { query, body, form, raw = false, headers = {} } = {}) {
    const url = new URL(path.startsWith('http') ? path : this.base + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) url.searchParams.append(k, '');
        else if (Array.isArray(v)) for (const x of v) url.searchParams.append(k, x);
        else url.searchParams.append(k, String(v));
      }
    }
    const h = { 'User-Agent': this.ua, Accept: 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest', ...headers };
    if (this.sid) h.Cookie = `sid=${this.sid}`;
    let payload;
    if (form) { payload = new URLSearchParams(form); h['Content-Type'] = 'application/x-www-form-urlencoded'; h.Origin = this.base; h.Referer = this.base + '/'; }
    else if (body !== undefined) { payload = JSON.stringify(body); h['Content-Type'] = 'application/json'; h.Origin = this.base; h.Referer = this.base + '/'; }

    const res = await this._fetch(url.toString(), { method, headers: h, body: payload, redirect: 'manual' });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* 非 JSON */ }

    // 秀米的 envelope 成功码：0 Common:OK，1 Common:Created，2 Common:Updated
    if (json && typeof json.code === 'number' && !OK_CODES.has(json.code)) {
      throw new XiumiError(json.message || 'API 错误', { code: json.code, status: res.status, path });
    }
    if (!res.ok && res.status !== 302) {
      throw new XiumiError(`HTTP ${res.status}`, { status: res.status, path });
    }
    if (raw) return { ...(json || { data: text }), status: res.status };
    return json ? json.data : text;
  }

  /**
   * 取一段 JSON。用于非 envelope 的接口（如 /api/shows/{id}/data/editing）
   * 以及 CDN 上的作品数据（show_data_url，形如 //sd.xiumius.cn/...）。
   * @param {string} urlOrPath 绝对 URL、// 开头、或 /api 相对路径
   * @returns {Promise<{status:number, json:any}>}
   */
  async fetchJson(urlOrPath) {
    const url = urlOrPath.startsWith('//') ? `https:${urlOrPath}`
      : /^https?:/.test(urlOrPath) ? urlOrPath
      : this.base + urlOrPath;
    const h = { 'User-Agent': this.ua, Accept: 'application/json, text/plain, */*' };
    if (url.startsWith(this.base) && this.sid) {
      h.Cookie = `sid=${this.sid}`;
      h['X-Requested-With'] = 'XMLHttpRequest';
    }
    const res = await this._fetch(url, { headers: h, redirect: 'follow' });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    // 带 envelope 的接口解一层 data；裸 JSON 直接用
    let out = json;
    if (json && typeof json === 'object' && typeof json.code === 'number' && 'data' in json) out = json.data;
    return { status: res.status, json: out === undefined ? text : out };
  }

  get get() { return (p, o) => this.request('GET', p, o); }
  get post() { return (p, o) => this.request('POST', p, o); }
  get put() { return (p, o) => this.request('PUT', p, o); }
  get del() { return (p, o) => this.request('DELETE', p, o); }

  // ---------------------------------------------------------------- 账号

  me() { return this.request('GET', '/auth/me').then((d) => d.user); }
  userInfo(include = []) { return this.request('GET', '/api/user/info', { query: { include } }); }
  loginHistory() { return this.request('GET', '/api/login_history'); }
  sysInfo() { return this.request('GET', '/api/sys_info'); }
  notify() { return this.request('GET', '/api/notify'); }
  apiKey() { return this.request('GET', '/api/apikey'); }
  /** [未实测] 新建 API Key，返回新建的 key */
  createApiKey() { return this.request('POST', '/api/apikey', { body: {} }); }
  /** [未实测] 停用某把 key */
  disableApiKey(id) { return this.request('PATCH', `/api/apikey/${id}/disable`, { body: {} }); }
  /** [未实测] 启用某把 key */
  enableApiKey(id) { return this.request('PATCH', `/api/apikey/${id}/enable`, { body: {} }); }
  /** [未实测] 重置某把 key 的密钥 */
  resetApiKey(id) { return this.request('POST', `/api/apikey/${id}/reset`, { body: {} }); }
  /** [未实测] 删除某把 key */
  deleteApiKey(id) { return this.request('DELETE', `/api/apikey/${id}`); }
  setNickname(nickname) { return this.request('PUT', '/api/user/info/nickname', { body: { nickname } }); }
  // 方法以 bundle 为准：h.put("/api/user/info/avatar",{avatar_url:...})，不是 POST
  setAvatar(avatar_url) { return this.request('PUT', '/api/user/info/avatar', { body: { avatar_url } }); }
  clearAvatar() { return this.request('POST', '/api/user/avatar/clear', { body: {} }); }
  resetPhoneState() { return this.request('GET', '/api/user/reset-phone'); }
  /** [未实测] 撤销已提交的换绑申请；t 是申请 id（路径段） */
  deleteResetPhone(t) { return this.request('DELETE', `/api/user/reset-phone/${t}`); }
  /** [未实测] 提交换绑手机申请 */
  submitResetPhone(body) { return this.request('POST', '/api/user/reset-phone', { body }); }
  /** [未实测] 冻结账号 */
  freezeUser(body = {}) { return this.request('POST', '/api/user/frozen', { body }); }
  /** [未实测] 改绑手机 */
  bindPhone(body) { return this.request('PUT', '/api/user/info/bind-phone', { body }); }
  /** [未实测] 改手机号（另一个入口） */
  setPhone(body) { return this.request('PUT', '/api/user/info/phone', { body }); }
  /** [未实测] 设置/换绑邮箱 */
  setEmail(body) { return this.request('PUT', '/api/user/info/email', { body }); }
  /** [未实测] 解绑邮箱 */
  removeEmail(body = {}) { return this.request('DELETE', '/api/user/info/email', { body }); }
  /** [未实测] 用秀点续期 */
  extendLifeByCoin(body) { return this.request('POST', '/api/user/info/extendlifebycoin', { body }); }
  /** [未实测] 用秀点升级 */
  upgradeByCoin(body) { return this.request('POST', '/api/user/info/upgradebycoin', { body }); }
  /** [未实测] 转移秀点 */
  transferCoin(body) { return this.request('POST', '/api/user/info/transfercoin', { body }); }
  templateMembershipState() { return this.request('GET', '/api/user/template_membership_state'); }
  /** 某作品可用的流量包。bundle：get("/api/user/traffic_package_list/for/"+show_id+"/owner") */
  trafficPackagesForShow(show_id) {
    return this.request('GET', `/api/user/traffic_package_list/for/${show_id}/owner`);
  }
  changePassword({ old_password, new_password }) { return this.request('PUT', '/api/user/password', { body: { old_password, new_password } }); }
  blacklist() { return this.request('GET', '/api/user/blacklist'); }
  contacts() { return this.request('GET', '/api/contacts/list'); }
  addContact(payload) { return this.request('POST', '/api/contacts/add', { body: payload }); }
  walletBalance() { return this.request('GET', '/api/wallet/my/balance'); }
  bills({ limit = 20, page = 0 } = {}) { return this.request('GET', '/api/wallet/bills', { query: { limit, page } }); }
  templateMembership() { return this.request('GET', '/api/user/template_membership'); }
  trafficPackages() { return this.request('GET', '/api/user/traffic_package_info'); }

  // ---------------------------------------------------------------- 作品（内容）

  /**
   * 作品列表（自己的 / 官方原型 / 团队）。
   * @param {{type?:string|string[], limit?:number, offset?:number, page?:number, search?:string,
   *          version?:number, patternFragment?:string, teamId?:number, sortBy?:string,
   *          enableFullTextSearch?:boolean, source?:'mine'|'official'|'teams'}} opts
   */
  async listShows({ type = 'paper', limit = 20, offset = 0, page, search, version, patternFragment, teamId, sortBy, enableFullTextSearch, source = 'mine' } = {}) {
    const base = source === 'official' ? '/api/shows/from/official'
      : source === 'teams' ? `/api/shows/from/teams/${teamId}` : '/api/shows';
    const query = { show_type: Array.isArray(type) ? type : [type] };
    if (limit !== undefined) query.limit = limit;
    if (offset !== undefined) query.offset = offset;
    if (page !== undefined) query.page = page;
    if (version) query.version = version;
    if (patternFragment) query.pattern_fragment = patternFragment;
    if (search) query.search = search;
    if (enableFullTextSearch !== undefined) query.enableFullTextSearch = enableFullTextSearch ? 1 : 0;
    if (sortBy) query.sort_by = sortBy;
    return this.request('GET', base, { query });
  }

  showsCount(type = 'paper', { version, patternFragment, search, enableFullTextSearch } = {}) {
    return this.request('GET', '/api/shows/count', {
      query: { show_type: type, version, pattern_fragment: patternFragment, search, enableFullTextSearch },
    });
  }

  /** 回收站原始返回 {count, deletedShows:[...]} */
  deletedShowsRaw({ type, version, limit = 16, page = 0, search, enableFullTextSearch } = {}) {
    return this.request('GET', '/api/shows/deleted/shows', {
      query: { show_type: type, version, limit, page, search, enableFullTextSearch },
    });
  }

  /** 回收站条目数组（每项含 deleted_show_id / orig_show_id） */
  async deletedShows(opts) {
    const d = await this.deletedShowsRaw(opts);
    return (d && d.deletedShows) || [];
  }

  teamShows(teamId, { type = 'all', version = 5, limit = 16, page = 0, search, patternFragment, sortBy } = {}) {
    return this.request('GET', `/api/shows/from/teams/${teamId}`, {
      query: { show_type: type, version, limit, page, search, pattern_fragment: patternFragment, sort_by: sortBy },
    });
  }

  officialShows({ type = 'paper', version, limit = 16, page = 0, search, patternFragment, sortBy } = {}) {
    return this.request('GET', '/api/shows/from/official2', {
      query: { show_type: type, version, limit, page, search, pattern_fragment: patternFragment, sort_by: sortBy },
    });
  }

  /**
   * 读取作品元信息。编辑器里就是详情面板的数据源。
   * @param {number|string} show_id
   * @param {string[]} [include] 额外字段，如 ['user','team','statistics']
   */
  getShow(show_id, include = []) {
    return this.request('GET', `/api/shows/${show_id}`, { query: { include: Array.isArray(include) ? include : [include] } });
  }

  /** 作品的历史版本列表 */
  showHistories(show_id) { return this.request('GET', `/api/shows/${show_id}/histories`); }

  showPaymentList(show_id) { return this.request('GET', `/api/shows/${show_id}/paymentlist`); }
  /**
   * 作品访问统计。bundle 里真实的两个入口是
   * `GET /api/statistics/show/{id}/daily` 与 `/ranks`（都带 ?count=）——
   * 光给 `/api/statistics/show/{id}` 会 404。
   * @param {number} show_id
   * @param {'daily'|'ranks'} kind
   */
  showStatistics(show_id, kind = 'daily', opts = {}) {
    return this.request('GET', `/api/statistics/show/${show_id}/${kind}`, { query: opts });
  }
  trafficPackageUsage(show_id) { return this.request('GET', `/api/shows/${show_id}/consumed/traffic_package/info`); }
  customDomainsForShow(show_id) { return this.request('GET', `/api/custom_domains/for/show/${show_id}`); }
  validateTeamShow(show_id) { return this.request('GET', `/api/shows/validate/teamshow/${show_id}`); }

  /**
   * 保存/新建作品（编辑器「保存」的等价动作）。
   * @param {string} type 作品类型：paper | tablet | booklet | placard | manuscript | poster
   * @param {object} payload 要么是编辑器生成的 {format,encodedData,signature}，
   *                         要么是作品数据对象（会自动用 wrapShowData 打包）
   * @param {{fromShowId?:number, uniqueUid?:string, toUser?:object}} [opts]
   *        toUser: { userCondition, userMail, teamId, teamEmail } —— 直接指派给他人/团队
   */
  async createShow(type, payload, { fromShowId, uniqueUid, toUser } = {}) {
    const user = await this._me();
    let body;
    if (payload && payload.encodedData) {
      body = { ...payload };
    } else {
      const data = { ...payload };
      const ap = (data.authorAppendix = data.authorAppendix || {});
      ap.originUserUniqueUID ||= user.unique_uid || '';
      ap.originUserSID ||= user.user_sid || '';
      ap.sourceUserUniqueUID = user.unique_uid || '';
      ap.sourceUserSID = user.user_sid || '';
      ap.creationTarget = ap.creationTarget || {};
      ap.actions = ap.actions || {};
      if (fromShowId) ap.actions.copyFromShowId = fromShowId;
      body = wrapShowData(data, uniqueUid || user.unique_uid || '');
    }
    if (toUser) {
      if (toUser.userCondition) body.userCondition = toUser.userCondition;
      if (toUser.userMail) body.userMail = toUser.userMail;
      if (toUser.teamId) body.teamId = toUser.teamId;
      if (toUser.teamEmail) body.teamEmail = toUser.teamEmail;
    }
    if (fromShowId) body.copyFromShowId = fromShowId;
    return this.request('POST', `/api/shows/v5/${type}`, { query: fromShowId ? { from_show_id: fromShowId } : undefined, body });
  }

  /**
   * 更新已有作品（编辑器「保存」在已有作品上的动作）。
   * PUT /api/shows/{show_id}，body = wrapData(data) + lastSavedAt + savingToken。
   *
   * 服务端做乐观锁：lastSavedAt 必须等于当前 saved_at，否则报
   * Camus:Failed_ShowSavedTimeNotMatch。此处遇到该错会自动取最新 saved_at 重试一次。
   *
   * @param {number|string|object} showOrId show_id 或至少含 {show_id, saved_at} 的元信息对象
   * @param {object} showData 作品数据对象
   */
  async updateShow(showOrId, showData, { uniqueUid, savingToken, retryOnStale = true } = {}) {
    let meta = (showOrId && typeof showOrId === 'object') ? showOrId : await this.getShow(showOrId);
    if (!meta || !meta.show_id) throw new XiumiError('updateShow 需要 {show_id,saved_at}');
    const user = await this._me();
    const uid = uniqueUid || user.unique_uid || '';
    const data = { ...showData };
    const ap = (data.authorAppendix = data.authorAppendix || {});
    ap.sourceUserUniqueUID = uid;
    ap.sourceUserSID = user.user_sid || '';
    const body = wrapShowData(data, uid);
    body.lastSavedAt = meta.saved_at;
    body.savingToken = savingToken || makeSavingToken();
    const path = `/api/shows/${meta.show_id}`;
    try {
      return await this.request('PUT', path, { body });
    } catch (e) {
      if (!retryOnStale || !/ShowSavedTimeNotMatch/.test(String(e.message))) throw e;
      meta = await this.getShow(meta.show_id);
      body.lastSavedAt = meta.saved_at;
      body.savingToken = makeSavingToken();
      return this.request('PUT', path, { body });
    }
  }

  /**
   * 拷贝作品（可拷给自己 / 他人 / 团队）。只传元信息，服务端负责复制内容。
   * @param {object} show 源作品（至少 {show_id, title, type_text, show_data_name}）
   * @param {{userCondition?:string,userMail?:string,teamId?:number,teamEmail?:string}} [toUser]
   */
  copyShow(show, toUser) {
    if (!show || !show.show_id) throw new XiumiError('copyShow 需要 show.show_id');
    const meta = { title: (show.title || '') + (toUser ? '' : ' - 拷贝') };
    const body = { ...wrapRawShowData(meta) };
    if (toUser?.userCondition) body.userCondition = toUser.userCondition;
    if (toUser?.userMail) body.userMail = toUser.userMail;
    if (toUser?.teamId) body.teamId = toUser.teamId;
    if (toUser?.teamEmail) body.teamEmail = toUser.teamEmail;
    body.copyFromShowId = show.show_id;
    // 编辑器从 show_data_name 取前两段路径，再前后 16 字符对调，作为动作令牌
    const segs = String(show.show_data_name || '').split('/').slice(0, 2).join('/');
    if (segs.length >= 32) body.tn_show_action_token_2 = segs.slice(16) + segs.slice(0, 16);
    return this.request('POST', `/api/shows/v5/${show.type_text || show.show_type || 'paper'}`, {
      query: { from_show_id: show.show_id },
      body,
    });
  }

  /** 把作品发（拷贝）给另一个账号 / 团队 / 自己另一个号 */
  sendShow(show_id, { toSelfAccount, toUserAccount, toTeamAccount, title_postfix = '- 拷贝' } = {}) {
    const body = { show_id, title_postfix };
    if (toSelfAccount) body.self_account = toSelfAccount;
    if (toUserAccount) body.user_account = toUserAccount;
    if (toTeamAccount) body.team_account = toTeamAccount;
    return this.request('POST', '/api/shows/send', { body });
  }

  /** 仅凭标题新建一个空白作品（等价于编辑器里点了「新建」） */
  createBlankShow(type = 'paper', title = '无标题') {
    return this.createShow(type, {
      title, show_type: type, version: '2.0', pages: [], grounds: [], overlaps: [],
    });
  }

  /**
   * 从官方模板库取一个组件，直接变成可放进 `layer.comps.items` 的对象。
   * **这是 AI 拼组件的正确姿势** —— tplId、constraint、style 全部来自站内，
   * 不要凭记忆手写（写错的 tplId 会被渲染器降级成占位图，且不一定报错）。
   *
   * @param {string} atom_tpl_id 如 `paper-cp:header/1-txt-normal`、`paper-cp:image/001-img-center`
   * @param {(comp:object)=>void} [mutate] 拿到 matrix 后改内容（如改 src / txt1.text）
   * @returns {Promise<object>} 组件对象（带新的 _$uuid 与 _$raHTML）
   * @example
   *   const img = await api.templateComp('paper-cp:image/001-img-center', (c) => { c.img1.src = url; });
   *   show.cubes[0].pages[0].layers[0].comps.items.push(img);
   */
  async templateComp(atom_tpl_id, mutate) {
    const items = await this.templateItems(atom_tpl_id);
    const tpl = Array.isArray(items) ? items[0] : null;
    if (!tpl || !tpl.matrix) throw new XiumiError(`模板不存在或没有 matrix：${atom_tpl_id}`);
    const comp = cloneComp(tpl.matrix);
    if (tpl.renderer_accelerate) comp._comp._$raHTML = tpl.renderer_accelerate;
    if (mutate) mutate(comp);
    return comp;
  }

  // ---- 从零创作：用站内空模板拼一份作品数据 ----

  /**
   * 造一份「有一个空 cube + 一页」的作品数据，可直接喂给 createShow / updateShow。
   * @param {string} type paper | booklet | tablet | placard
   * @param {string} title
   */
  buildShow(type = 'paper', title = '无标题') {
    const show = emptyShow(type, title);
    const cube = emptyCube(type);
    cube.pages.push(emptyPage(type));
    cube.grounds.push(emptyGround());
    show.cubes.push(cube);
    return show;
  }

  /**
   * 往作品里追加一页。文本走 textComp，图片走 imageComp（先 uploadImageBase64 拿 target_uri）。
   * @param {object} showData buildShow / readShowData 拿到的作品数据（原地修改并返回）
   * @param {{texts?:string[], imageSrc?:string, type?:string, ground?:boolean}} opts
   */
  appendPage(showData, { texts = [], imageSrc, type = 'paper', ground = true } = {}) {
    const cube = showData.cubes?.[0];
    if (!cube) throw new XiumiError('appendPage 需要 cubes[0]，先用 buildShow 或 clone 一份数据');
    const page = emptyPage(type);
    const layer = page.layers[0];
    for (const html of texts) layer.comps.items.push(textComp(html));
    if (imageSrc) layer.comps.items.push(imageComp(imageSrc));
    cube.pages.push(page);
    if (ground) cube.grounds.push(emptyGround());
    return showData;
  }

  /**
   * 一步保存：给了 show_id 就 PUT，否则 POST 新建。
   * @returns {Promise<object>} 作品的元信息（新建时是创建响应）
   */
  async save(showData, show_id) {
    if (show_id) {
      const meta = await this.getShow(show_id);
      return this.updateShow(meta, showData);
    }
    const type = showData.scene === 'flw.vertical.one-page'
      ? (showData.usageScenario === 'placard' ? 'placard' : 'paper') : 'booklet';
    return this.createShow(type, showData);
  }

  async _me() {
    if (!this._user) this._user = await this.me();
    return this._user;
  }

  // ---- 作品内容读取 ----

  /**
   * 拉取作品数据 JSON。
   * 编辑器实际做法：直接 GET 元信息里的 show_data_url（公开 CDN，无需登录态）；
   * editing=true 时走 editing_show_data_url（草稿态，需登录态，返回裸 JSON 非 envelope）。
   * @param {number|string|object} showOrUrl show_id / URL / 作品元信息对象
   * @param {{editing?:boolean}} [opts]
   */
  async readShowData(showOrUrl, { editing = false } = {}) {
    let url;
    let meta = null;
    if (typeof showOrUrl === 'number' || /^\d+$/.test(String(showOrUrl))) {
      meta = await this.getShow(showOrUrl);
      url = (editing && meta?.editing_show_data_url) || meta?.show_data_url;
    } else if (typeof showOrUrl === 'string') {
      url = showOrUrl;
    } else if (showOrUrl && typeof showOrUrl === 'object') {
      meta = showOrUrl;
      url = (editing && showOrUrl.editing_show_data_url) || showOrUrl.show_data_url;
    }
    if (!url) return { meta, data: null, status: 0 };
    const { status, json } = await this.fetchJson(url);
    return { meta, data: json, status };
  }

  /** 元信息 + 内容一次拿全 */
  async getShowFull(show_id) {
    const meta = await this.getShow(show_id);
    const { data } = await this.readShowData(meta);
    return { meta, data };
  }

  // ---- 作品生命周期 ----

  /**
   * 给作品改名。
   * 注意：`PUT /api/shows/{id}` 只给 `{title}` 会被服务端以 Common:Failed_DataRejected 拒掉
   * （它要的是完整作品数据，见 `updateShow`）。所以这里走「读草稿 → 改 title → 整包 PUT」，
   * 这才是编辑器里改名实际发生的事。
   */
  async renameShow(show_id, title) {
    const meta = await this.getShow(show_id);
    const ed = await this.readShowData(meta, { editing: true }).catch(() => null);
    const data = ed?.data || (await this.readShowData(meta)).data;
    data.title = title;
    const fresh = await this.getShow(show_id);
    return this.updateShow(fresh, data);
  }
  /** 删除作品（进回收站）。返回 "Deleted" */
  deleteShow(show_id) { return this.request('DELETE', `/api/shows/${show_id}`); }
  /**
   * 从回收站恢复。注意参数是**回收站条目里的 deleted_show_id**，
   * 不是 orig_show_id（用原 id 会 404）。返回 "Recovered"。
   */
  recoverShow(deleted_show_id) { return this.request('POST', `/api/shows/recover/${deleted_show_id}`); }
  /** 恢复（编辑器 restore 动作，部分账号可用） */
  restoreShow(show_id) { return this.request('PUT', `/api/shows/${show_id}/restore`); }

  /** 设置作品权限位（right_access_privilege 的位含义见 docs） */
  setRightAccessPrivilege(show_id, value) { return this.request('PUT', `/api/shows/${show_id}/right_access_privilege/${value}`); }
  setTrafficPackageUsage(show_id, value) { return this.request('PUT', `/api/shows/${show_id}/use_traffic_package/${value}`); }
  setWechatNoShare(show_id, value) { return this.request('PUT', `/api/shows/${show_id}/wechat_no_share/${value}`); }
  submitReleaseApplication(show_id) { return this.request('POST', `/api/shows/${show_id}/release/application`); }
  /** 生成预览链接（preview_for: normal | ...） */
  previewUri(to, previewFor = 'normal') { return this.request('GET', '/preview/uri', { query: { to, preview_for: previewFor } }); }

  // ---- 公众号文章导入 ----

  /** 通过公众号文章 URL 抓取正文结构（返回结构化的文章数据） */
  wxArticleData(articleurl) { return this.request('POST', '/api/shows/getwxarticledata', { body: { articleurl } }); }
  /** 把公众号文章直接导入为一个作品 */
  importWxArticle(articleurl) { return this.request('POST', '/api/shows/importwxarticle', { body: { articleurl } }); }

  // ---- 标签（show tags）----

  /** GET /api/shows/{type|all}/tags */
  listTags(type = 'all', { team_id } = {}) {
    return this.request('GET', `/api/shows/${type || 'all'}/tags`, { query: { team_id } }).then((d) => (d && d.tags) || d);
  }
  tagsAndOrder(type = 'all', { team_id } = {}) { return this.request('GET', `/api/shows/${type || 'all'}/tags`, { query: { team_id } }); }
  tagsOrder({ team_id } = {}) { return this.request('GET', '/api/shows/tags/order', { query: { team_id } }); }
  /**
   * 作品标签排序。`order` 必须是**字符串**：服务端对数组直接报
   * `Common:Failed: "arguments[2]" must be of type "string | Buffer"`（实测）。
   * 传数组会自动 `JSON.stringify`。
   */
  setTagsOrder(order, { team_id } = {}) {
    return this.request('POST', '/api/shows/tags/order', { body: { order: asOrder(order), team_id } });
  }
  /** 给作品打标签（tag 会被 encodeURIComponent） */
  addTag(show_id, tag) { return this.request('POST', `/api/shows/${show_id}/tags`, { body: { tag: encodeURIComponent(tag) } }); }
  removeTag(show_id, tag) { return this.request('DELETE', `/api/shows/${show_id}/tags/${encodeURIComponent(tag)}`); }
  renameTag(old_tag, new_tag, { team_id } = {}) { return this.request('POST', '/api/shows/tags/rename', { body: { old_tag, new_tag, team_id } }); }
  clearTag(tag, { team_id } = {}) { return this.request('DELETE', `/api/shows/tags/clear/${encodeURIComponent(tag)}`, { query: { team_id } }); }
  showsInTag(tag, { type, team_id, limit = 16, page = 0, search, patternFragment, enableFullTextSearch, sortBy } = {}) {
    return this.request('GET', `/api/shows/by/tags/${encodeURIComponent(tag)}`, {
      query: { show_type: type || null, team_id, limit, page, search, pattern_fragment: patternFragment, enableFullTextSearch, sort_by: sortBy },
    });
  }
  showsUntag({ type, team_id, limit = 16, page = 0, search, patternFragment, enableFullTextSearch, sortBy } = {}) {
    return this.request('GET', '/api/shows/by/untag', {
      query: { show_type: type || null, team_id, limit, page, search, pattern_fragment: patternFragment, enableFullTextSearch, sort_by: sortBy },
    });
  }

  // ---- 模板碎片标签（pattfrag-tags，平行于上面的 tags）----

  listPattFragTags(type = 'all', { team_id } = {}) { return this.request('GET', `/api/shows/${type || 'all'}/pattfrag-tags`, { query: { team_id } }); }
  pattFragTagsOrder({ team_id } = {}) { return this.request('GET', '/api/shows/pattfrag-tags/order', { query: { team_id } }); }
  setPattFragTagsOrder(order, { team_id } = {}) { return this.request('POST', '/api/shows/pattfrag-tags/order', { body: { order, team_id } }); }
  addPattFragTag(show_id, tag) { return this.request('POST', `/api/shows/${show_id}/pattfrag-tags`, { body: { tag: encodeURIComponent(tag) } }); }
  removePattFragTag(show_id, tag) { return this.request('DELETE', `/api/shows/${show_id}/pattfrag-tags/${encodeURIComponent(tag)}`); }
  renamePattFragTag(old_tag, new_tag, { team_id } = {}) { return this.request('POST', '/api/shows/pattfrag-tags/rename', { body: { old_tag, new_tag, team_id } }); }
  clearPattFragTag(tag, { team_id } = {}) { return this.request('DELETE', `/api/shows/pattfrag-tags/clear/${encodeURIComponent(tag)}`, { query: { team_id } }); }
  showsInPattFragTag(tag, { type, team_id, limit = 16, page = 0, sortBy } = {}) {
    return this.request('GET', `/api/shows/by/pattfrag-tags/${encodeURIComponent(tag)}`, {
      query: { show_type: type ? encodeURIComponent(type) : null, team_id, limit, page, sort_by: sortBy },
    });
  }


  // ---------------------------------------------------------------- 素材库

  listImages({ limit = 20, offset = 0, team_id, search } = {}) {
    return this.request('GET', '/api/assets/list/image', { query: { limit, offset, team_id, search } });
  }
  imagesCount({ team_id } = {}) { return this.request('GET', '/api/assets/list/image/count', { query: { team_id } }); }
  usedImagesCount({ team_id } = {}) { return this.request('GET', '/api/assets/list/image/used', { query: { team_id } }); }
  listVideos({ limit = 20, offset = 0, team_id } = {}) { return this.request('GET', '/api/assets/list/video', { query: { limit, offset, team_id } }); }
  listAudios({ limit = 20, offset = 0, team_id } = {}) { return this.request('GET', '/api/assets/list/audio', { query: { limit, offset, team_id } }); }
  imageTags({ team_id } = {}) { return this.request('GET', '/api/assets/type/image/tags', { query: { team_id } }); }
  deleteAsset(asset_id) { return this.request('DELETE', `/api/assets/${asset_id}`); }
  /** 清空图库（scope: 个人或某个 team_id） */
  clearImages({ team_id } = {}) { return this.request('POST', '/api/assets/clearimages', { body: { team_id } }); }

  /**
   * 以 base64 上传一张图片到图库（最简上传路径，无需 COS 签名）。
   * 服务端要求 base64 **带 data URI 前缀**（`data:image/png;base64,...`），
   * 裸 base64 会返回 Common:Failed_InvalidParam。默认已加前缀。
   * @param {Buffer|Uint8Array} data 图片字节
   * @param {string} filename 文件名（含扩展名）
   * @returns {Promise<{target_uri:string, display_name:string, asset_type:number}>} target_uri 就是图片地址
   */
  uploadImageBase64(data, filename, { team_id, dataUri = true, mime } = {}) {
    const b64 = Buffer.from(data).toString('base64');
    const m = mime || (/\.jpe?g$/i.test(filename) ? 'image/jpeg'
      : /\.gif$/i.test(filename) ? 'image/gif'
        : /\.webp$/i.test(filename) ? 'image/webp' : 'image/png');
    return this.request('POST', '/api/assets/image/data', {
      body: { base64: dataUri ? `data:${m};base64,${b64}` : b64, filename, team_id },
    });
  }

  /** 把外链图片收进图库 */
  addImageOutlink(image_url, { team_id, updateTsIfExisted = false } = {}) {
    return this.request('POST', '/api/assets/image/outlink', { body: { image_url, team_id, updateTsIfExisted } });
  }

  /** 取 CDN 直传凭证（大文件走这条路：token → COS 直传 → cosobj 登记） */
  uploadCdnToken({ upload_type = 'image', team_id, watermark } = {}) {
    return this.request('POST', '/api/upload-cdn/token', { body: { upload_type, team_id, watermark } });
  }
  uploadToken({ upload_type = 'image', team_id } = {}) {
    return this.request('GET', '/api/upload/token', { query: { upload_type, team_id } });
  }
  registerCosObject({ object_name, team_id, watermark }) {
    return this.request('POST', '/api/assets/image/cosobj', { body: { object_name, team_id, watermark } });
  }

  // ---------------------------------------------------------------- 模板 / 片段

  /**
   * 官方组件/模板库（21k+ 条）。
   * 每条含 `matrix`（可直接放进 layer.comps.items 的组件 JSON）与
   * `renderer_accelerate`（对应的 `_$raHTML` 预渲染 HTML）——
   * **这是 AI 从零拼组件的正确来源**，不要手写 tplId。
   *
   * @param {{tagCategory?:string, tag_ids?:string|string[], q?:string,
   *          sort?:'ASC'|'DESC', limit?:number, page?:number}} opts
   */
  listTemplates({ tagCategory = 'paper-cp', tag_ids, q, match_level = 'default', sort = 'DESC', limit = 20, page = 0 } = {}) {
    return this.request('GET', '/api/templates', {
      query: {
        tag_ids, tag_category: tagCategory, q, match_level,
        template_category: tagCategory, sort, limit, page,
      },
    });
  }
  /** 取指定组件的 matrix + renderer_accelerate（可一次问多个 atom_tpl_id） */
  templateItems(atom_tpl_id) {
    return this.request('GET', '/api/templates/items', {
      query: { atom_tpl_id: Array.isArray(atom_tpl_id) ? atom_tpl_id : [atom_tpl_id] },
    });
  }
  templateTagsTree({ tagCategory = 'paper-cp', tag_level_from = 2, tag_level_to = 0, template = false } = {}) {
    return this.request('GET', '/api/templates/tags_tree', { query: { tag_category: tagCategory, tag_level_from, tag_level_to, template } });
  }

  // ---------------------------------------------------------------- 收藏碎片（fragments）
  //
  // category 取值：comp（纸媒组件 / paper）| page（册子页面 / booklet）
  // 实测流量里出现过 /api/fragments/v5/paper/comp/tagsorder 与 /api/fragments/v5/booklet/page/tagsorder。
  // 路径来自编辑器 studio/services/fragmentsAPI。

  /** 按标签浏览碎片：GET /api/fragments/v5/{type}/{category}/tags/{tag} */
  listFragmentsByTag(tag, { type = 'paper', category = 'comp', limit = 30, offset = 0, order = 'DESC', team_id } = {}) {
    return this.request('GET', `/api/fragments/v5/${type}/${category}/tags/${encodeURIComponent(tag)}`, {
      query: { limit, offset, order, team_id },
    });
  }

  /** 未打标签的碎片 */
  listFragments({ type = 'paper', category = 'comp', limit = 30, offset = 0, order = 'DESC', team_id } = {}) {
    return this.request('GET', `/api/fragments/v5/${type}/${category}/untags`, { query: { limit, offset, order, team_id } });
  }

  /** 碎片标签详情（含每个标签下的碎片） */
  fragmentTagDetails(type = 'paper', category = 'comp', { team_id } = {}) {
    return this.request('GET', `/api/fragments/v5/${type}/${category}/tags`, { query: { team_id } });
  }
  /** 碎片标签排序（与 tag 维度共用，第一段是 show type、第二段是 category）。order 必须是字符串。 */
  fragmentTagsOrder(type = 'paper', category = 'comp', { team_id } = {}) {
    return this.request('GET', `/api/fragments/v5/${type}/${category}/tagsorder`, { query: { team_id } });
  }
  setFragmentTagsOrder(type, category, order, { team_id } = {}) {
    return this.request('POST', `/api/fragments/v5/${type}/${category}/tagsorder`, { body: { order: asOrder(order), team_id } });
  }
  /**
   * 给碎片打标签。
   * ⚠️ 这条是**未验证**的：实测 `POST /api/fragments/v5/paper/tags {tag}` 返回
   * Common:Failed_NotFound，补上 category 段（`/paper/comp/tags`）则是 404。
   * 创建入口大概率在编辑器 bundle（studio/services/fragmentsAPI）里，本地没抓到那份包。
   * 删除/改名两条路径是可用的，创建这条在使用前请自行回读确认。
   */
  addFragmentTag(fragment_id, tag, { type = 'paper' } = {}) {
    return this.request('POST', `/api/fragments/v5/${type}/tags`, { body: { tag: encodeURIComponent(tag) } });
  }
  removeFragmentTag(fragment_id, tag, { type = 'paper' } = {}) {
    return this.request('DELETE', `/api/fragments/v5/${type}/tags/${encodeURIComponent(tag)}`);
  }
  deleteFragmentTag(type, category, tag, { team_id } = {}) {
    return this.request('DELETE', `/api/fragments/v5/${type}/${category}/tag/${encodeURIComponent(tag)}`, { query: { team_id } });
  }
  renameFragmentTag(type, category, old_tag, new_tag, { team_id } = {}) {
    return this.request('POST', `/api/fragments/v5/${type}/${category}/tagsrename`, { body: { old_tag, new_tag, team_id } });
  }
  clearUntagFragments(type = 'paper', category = 'comp', { team_id } = {}) {
    return this.request('DELETE', `/api/fragments/v5/${type}/${category}/untags/clearfragments`, { query: { team_id } });
  }
  clearTagFragments(type, category, tag, { team_id } = {}) {
    return this.request('DELETE', `/api/fragments/v5/${type}/${category}/tags/${encodeURIComponent(tag)}/clearfragments`, { query: { team_id } });
  }
  /** 已用/可用碎片额度 */
  usedFragmentsCount(type = 'paper', { team_id } = {}) {
    return this.request('GET', `/api/fragments/used/${type}`, { query: { team_id } });
  }
  /** 把碎片「顶」到列表最前 */
  upFragment(fragment_id) { return this.request('POST', `/api/fragments/up/${fragment_id}`); }

  // ---------------------------------------------------------------- 表单 / 统计

  formData(show_id, { limit = 50, page = 0 } = {}) { return this.request('GET', `/api/forms/data/forshow/${show_id}`, { query: { limit, page } }); }
  formCount(show_id) { return this.request('GET', `/api/forms/count/${show_id}`); }
  /**
   * 表单型作品的提交数据。bundle 的路径**必须带 show_id**：
   * `GET /api/forms/{show_id}/?page=&per_page=` —— 无参的 `/api/forms` 实测 404。
   */
  forms(show_id, { page = 0, per_page = 20 } = {}) {
    if (show_id === undefined) throw new Error('forms(show_id, …)：表单数据挂在具体作品上，缺少 show_id');
    return this.request('GET', `/api/forms/${show_id}/`, { query: { page, per_page } });
  }

  // ---------------------------------------------------------------- 团队 / 订单

  teams() { return this.request('GET', '/api/teams'); }
  team(team_id) { return this.request('GET', `/api/teams/${team_id}`); }
  orders({ limit = 20, page = 0 } = {}) { return this.request('GET', '/api/orders', { query: { limit, page } }); }
  invoices({ limit = 20, page = 0 } = {}) { return this.request('GET', '/api/invoices', { query: { limit, page } }); }
  messages({ limit = 20, page = 0, state } = {}) { return this.request('GET', '/api/messages', { query: { limit, page, state } }); }
  messagesStatus() { return this.request('GET', '/api/messages/status'); }
  messageSettings() { return this.request('GET', '/api/messages/settings'); }
  /**
   * 静音开关。三个 kind：`mute_new_show` / `mute_invitation` / `mute_be_saved_to`。
   * bundle：post("/api/messages/setting/mute_new_show/"+v, {})，值在**路径段**上。
   * 写完用 `messageSettings()` 回读即可确认（实测 0→1→0 可逆）。
   */
  setMute(kind /* 'mute_new_show' | 'mute_invitation' | 'mute_be_saved_to' */, value) {
    return this.request('POST', `/api/messages/setting/${kind}/${value ? 1 : 0}`, { body: {} });
  }

  // ---------------------------------------------------------------- 渲染导出

  renderScreenshot(show_id, opts = {}) { return this.request('GET', `/api/renderer/screenshot/show/${show_id}`, { query: opts }); }
  renderPdf(show_id, opts = {}) { return this.request('GET', `/api/renderer/pdf/show/${show_id}`, { query: opts }); }
  renderGif(show_id, opts = {}) { return this.request('GET', `/api/renderer/gif/show/${show_id}`, { query: opts }); }
  renderVideo(show_id, opts = {}) { return this.request('GET', `/api/renderer/video/show/${show_id}`, { query: opts }); }
  renderFrames(show_id, opts = {}) { return this.request('GET', `/api/renderer/frames/show/${show_id}`, { query: opts }); }
  renderExport(show_id, opts = {}) { return this.request('GET', `/api/renderer/export/${show_id}`, { query: opts }); }
  renderComp(opts = {}) { return this.request('GET', '/api/renderer/comp/show', { query: opts }); }

  // ================================================================
  // 以下为 2026-09-20 补全：此前只进了文档、客户端缺封装的部分。
  // 除特别注明外，路径与 HTTP 方法取自 bundle 静态提取（verified=bundle/probe），
  // 未做端到端写验证。标注 [未实测] 的调用前请自带可逆性保护。
  // ================================================================

  // ---------------------------------------------------------------- 偏好设置 user_setting
  // 影响编辑器水印与展示样式，创作链路会用。

  userSetting() { return this.request('GET', '/api/user_setting'); }
  /**
   * 通用设置写入。bundle 是 `post("/api/user_setting", {settings: r})`，
   * 其中 r 是「设置键 → 值」的整张表（编辑器把它当整体同步，不是逐键提交）。
   * @param {Record<string, unknown>} settings
   */
  updateUserSetting(settings) { return this.request('POST', '/api/user_setting', { body: { settings } }); }
  /**
   * 发布页背景图。bundle：`post("/api/user_setting/background", {background: v})`，
   * v 取设置里的 `studio.appearance.desk.background`。
   */
  setBackground(background) { return this.request('POST', '/api/user_setting/background', { body: { background } }); }
  palette() { return this.request('GET', '/api/user_setting/palette'); }
  /**
   * 调色板（编辑器配色预设）。
   * bundle：`post("/api/user_setting/palette", {palette: encodeURIComponent(toJson(colorGroups)), team_id, user_id})`
   * —— palette 是**URI 编码后的 JSON 字符串**，不是对象数组。
   */
  setPalette(colorGroups, { team_id, user_id } = {}) {
    const palette = encodeURIComponent(JSON.stringify(colorGroups ?? []));
    return this.request('POST', '/api/user_setting/palette', { body: { palette, team_id, user_id } });
  }
  /**
   * 作品接收类型。
   * bundle：`post("/api/user_setting/show-receive-type", {showReceiveType: v})`
   * —— 值在 **body** 里，不是路径段（早先按路径段写，实测 404）。
   */
  setShowReceiveType(value) {
    return this.request('POST', '/api/user_setting/show-receive-type', { body: { showReceiveType: value } });
  }
  watermark() { return this.request('GET', '/api/user_setting/watermark'); }
  /**
   * 水印设置。
   * bundle：`post("/api/user_setting/watermark", e)`，e 含 `watermarks` 列表；
   * GET 返回 `{watermarks, readOnly}`，`readOnly=true` 时服务端拒绝改写。
   */
  setWatermark(watermarks, { team_id } = {}) {
    return this.request('POST', '/api/user_setting/watermark', { body: { watermarks, team_id } });
  }
  /** 水印是否对全部作品生效 */
  watermarkAll() { return this.request('GET', '/api/user_setting/watermark-all'); }

  // ---------------------------------------------------------------- 评论 comments
  //
  // ★ 关键：评论全部挂在作品上，路径必须带 show_id。
  //   不存在 `GET /api/comments`（实测 404）。
  //   bundle 证据：`l.get("/api/comments/"+s.show_id+"?ver="+Date.now())`

  /** 读某作品的评论。bundle 会带 ?ver=<时间戳> 破缓存 */
  comments(show_id, { ver = Date.now(), ...rest } = {}) {
    return this.request('GET', `/api/comments/${show_id}`, { query: { ver, ...rest } });
  }
  /** [未实测] 清空某作品的评论。bundle：l.delete("/api/comments/"+t) */
  deleteComments(show_id) { return this.request('DELETE', `/api/comments/${show_id}`); }
  /** 评论白名单 */
  commentRights(show_id) { return this.request('GET', `/api/comments/rights/${show_id}`); }
  /**
   * [未实测] 给作品加个人评论权限（白名单）。
   * bundle 有两条分支：有 email 走 {name,email,ts}，只有手机号走 {name,area_code,phone,ts}
   */
  addCommentRightUser(show_id, { name, email, area_code, phone, ts } = {}) {
    const body = email ? { name, email, ts } : { name, area_code, phone, ts };
    return this.request('POST', `/api/comments/rights/user/${show_id}`, { body });
  }
  /** [未实测] 加团队评论权限。bundle：post("/api/comments/rights/team/"+id,{team_name,team_id,ts}) */
  addCommentRightTeam(show_id, { team_name, team_id, ts } = {}) {
    return this.request('POST', `/api/comments/rights/team/${show_id}`, { body: { team_name, team_id, ts } });
  }
  /** [未实测] 把个人移入评论黑名单（回收站）。bundle：{email} 或 {area_code,phone} */
  trashCommentRightUser(show_id, { email, area_code, phone } = {}) {
    const body = email ? { email } : { area_code, phone };
    return this.request('POST', `/api/comments/rights/trash/user/${show_id}`, { body });
  }
  /** [未实测] 把团队移入评论黑名单。bundle：{team_id} */
  trashCommentRightTeam(show_id, { team_id } = {}) {
    return this.request('POST', `/api/comments/rights/trash/team/${show_id}`, { body: { team_id } });
  }
  /** 评论邀请分享 token（拼出 /comment/v5 分享链接用） */
  commentShareToken(show_id) { return this.request('GET', `/api/comments/share/token/${show_id}`); }

  // ---------------------------------------------------------------- 文本理解 nlp
  // 站内「智能提取小标题」。做 AI 辅助排版时可用。

  /** [未实测] 提交正文提取小标题 */
  extractHeadings(body) { return this.request('POST', '/api/nlp/extract_headings', { body }); }
  /** [未实测] 第二版提取接口；参数未枚举 */
  extractHeadings2(opts = {}) { return this.request('GET', '/api/nlp/extract_headings2', { query: opts }); }
  /** [未实测] 查提取任务状态 */
  headingTask(task_id) { return this.request('GET', `/api/nlp/extract_headings2/tasks/${task_id}`); }
  /** [未实测] 取某个词的处理结果；原提取结果为「方法未知」，此处按 GET */
  headingWord(word_id) { return this.request('GET', `/api/nlp/extract_headings2/word/${word_id}`); }

  // ---------------------------------------------------------------- 帮助 help

  searchHelp(q) { return this.request('GET', '/api/help/search', { query: { q } }); }
  recommendedHelp() { return this.request('GET', '/api/help/recommended'); }
  /** [未实测] 帮助条目（疑似站内运营用，普通账号可能 403） */
  addHelp(body) { return this.request('POST', '/api/help/add', { body }); }
  /** [未实测] 路径可疑，可能提取有误 */
  deleteHelp(body) { return this.request('DELETE', '/api/help', { body }); }
  /** [未实测] 方法与路径组合可疑，可能提取有误 */
  recommendedHelpAdd(body) { return this.request('POST', '/api/help/recommended', { body }); }
  recommendedHelpRemove(body) { return this.request('DELETE', '/api/help/recommended', { body }); }
  /** [未实测] 路径可疑，可能提取有误 */
  helpCheck(body) { return this.request('DELETE', '/api/help/check', { body }); }

  // ---------------------------------------------------------------- 账号全链路：短信 / 邮箱
  // 补齐「注册 / 改手机 / 改邮箱 / 重置密码 / 二次验证」。
  // 这些都是 [未实测] 写接口，且带真实短信/邮件副作用 —— 不要随手调。

  /** 校验手机号是否可用（发验证码前的预检） */
  smsValidatePhone(body) { return this.request('POST', '/api/sms/validate_phone', { body }); }
  /** 短信验证码校验 —— 登录二步 / 敏感操作的通用动作入口 */
  smsAuthAction(body) { return this.request('POST', '/api/sms/auth_action', { body }); }
  /** 人工审核通道 */
  smsAuthManual(body) { return this.request('POST', '/api/sms/auth_manual', { body }); }
  /** 跳过二次验证（有风控条件） */
  smsAuthSkip(body) { return this.request('POST', '/api/sms/auth_skip', { body }); }
  /** 短信注册新账号 */
  smsRegister(body) { return this.request('POST', '/api/sms/register_user', { body }); }
  /** 短信重置密码 */
  smsResetPassword(body) { return this.request('POST', '/api/sms/reset_password', { body }); }
  /** 换绑手机号 */
  smsChangePhone(body) { return this.request('POST', '/api/sms/change_phone', { body }); }

  emailValidate(body) { return this.request('POST', '/api/email/validate_email', { body }); }
  emailAuth(body) { return this.request('POST', '/api/email/auth', { body }); }
  emailAuthAction(body) { return this.request('POST', '/api/email/auth_action', { body }); }
  emailResetPassword(body) { return this.request('POST', '/api/email/reset_password', { body }); }
  emailChange(body) { return this.request('POST', '/api/email/change_email', { body }); }
  /** 邮箱登录后的落地页（OAuth/邮件链接会跳这里） */
  emailLoginSuccess() { return this.request('GET', '/auth/email/success'); }

  // ---------------------------------------------------------------- 第三方绑定 / OAuth 入口
  //
  // 重要：绑定**不是 XHR**。bundle 里是 `location.href = "/auth/bind_qq"`，
  // 属于整页导航（302 到第三方授权页）。所以这里只提供 URL，不发请求。
  // 解绑才是真的 POST，且 body 固定为 {force:true}。

  /** 绑定 URL（交给浏览器打开，无法在纯 HTTP 客户端里自动完成） */
  bindUrl(provider /* 'qq' | 'wechat' | 'weibo' */) { return `${this.base}/auth/bind_${provider}`; }
  unbindQq() { return this.request('POST', '/api/user/unbind_qq', { body: { force: true } }); }
  unbindWechat() { return this.request('POST', '/api/user/unbind_wechat', { body: { force: true } }); }
  unbindWeibo() { return this.request('POST', '/api/user/unbind_weibo', { body: { force: true } }); }
  unbindApple() { return this.request('POST', '/api/user/unbind_apple', { body: { force: true } }); }
  /** 未登录态用第三方账号登录（同样只能走浏览器导航） */
  loginUrl(provider /* 'qq' | 'wechat' | 'weibo' */) { return `${this.base}/auth/${provider}`; }
  /** 移动端微信 OAuth 入口（方法原提取为「未知」，按导航处理） */
  mobileWechatUrl() { return `${this.base}/auth/mobile_wechat`; }
  /** 开放连接换取 access_code */
  connectAccessCode(opts = {}) { return this.request('GET', '/auth/connect/user/access_code', { query: opts }); }
  /** 协议签署状态：同意 */
  agreeAccess(body = {}) { return this.request('PUT', '/auth/agreement/access', { body }); }
  /** 协议签署状态：拒绝 */
  agreeReject(body = {}) { return this.request('PUT', '/auth/agreement/reject', { body }); }

  // ---------------------------------------------------------------- 身份 / 发布者资质

  userIdentity() { return this.request('GET', '/api/user/identity'); }
  /** [未实测] 提交实名/资质信息 */
  setUserIdentity(body) { return this.request('POST', '/api/user/identity', { body }); }
  publisherIdentity(opts = {}) { return this.request('GET', '/api/publisher/identity', { query: opts }); }
  /** [未实测] 提交发布者身份 */
  setPublisherIdentity(body) { return this.request('POST', '/api/publisher/identity', { body }); }
  /** [未实测] 撤销发布者身份 */
  removePublisherIdentity(body = {}) { return this.request('DELETE', '/api/publisher/identity', { body }); }

  // ---------------------------------------------------------------- 自定义域名（企业版）

  /** 自定义域名列表。bundle 的 `$http` 调用带 `team_id`，个人账号不带会 Failed_InvalidParam。 */
  customDomains({ team_id } = {}) { return this.request('GET', '/api/custom_domains', { query: { team_id } }); }
  customDomainsForShow(opts = {}) { return this.request('GET', '/api/custom_domains/for/show', { query: opts }); }
  /** [未实测] 新增自定义域名 */
  addCustomDomain(body) { return this.request('POST', '/api/custom_domains', { body }); }
  /** [未实测] 修改自定义域名 */
  updateCustomDomain(body) { return this.request('PUT', '/api/custom_domains', { body }); }
  /** [未实测] 删除自定义域名 */
  removeCustomDomain(body) { return this.request('DELETE', '/api/custom_domains', { body }); }

  // ---------------------------------------------------------------- 音频库

  audioList(opts = {}) { return this.request('GET', '/api/audio/audio_list', { query: opts }); }
  audioCategories() { return this.request('GET', '/api/audio/category_list'); }
  audioSources() { return this.request('GET', '/api/audio/source_list'); }

  /** 站内字体：批量取 woff @font-face（原提取结果为「方法未知」，此处按 GET） */
  fontFaces(opts = {}) { return this.request('GET', '/api/fonts/youziku/get_batch_woff_font_face', { query: opts }); }

  // ---------------------------------------------------------------- 二维码 / 分享

  /** [未实测] 生成二维码 token */
  qrToken(body) { return this.request('POST', '/api/qrimage/token', { body }); }
  qrProgress(opts = {}) { return this.request('GET', '/api/qrimage/progress', { query: opts }); }
  /** [未实测] 撤销二维码 token */
  qrTokenRevoke(body = {}) { return this.request('DELETE', '/api/qrimage/token', { body }); }
  /** [未实测] 保存二维码分享配置 */
  qrshareSave(body) { return this.request('POST', '/api/qrshare/show/save', { body }); }
  /** [未实测] 发起二维码分享 */
  qrshareShare(body) { return this.request('POST', '/api/qrshare/show/share', { body }); }

  // ---------------------------------------------------------------- 作品商城 show_goods
  // 「卖作品 / 买作品」整条线，全部 [未实测]。发布作品前需先过 originality 原创审核。

  /** 原创审核材料上传入口（返回上传地址，不是直接传） */
  originalityUploadUrl(opts = {}) { return this.request('GET', '/api/show_goods/application/originality_file_upload', { query: opts }); }
  applications(opts = {}) { return this.request('GET', '/api/show_goods/applications', { query: opts }); }
  /** [未实测] 提交原创审核申请 */
  submitApplication(body) { return this.request('POST', '/api/show_goods/applications', { body }); }
  /** [未实测] 修改审核申请 */
  updateApplication(body) { return this.request('PUT', '/api/show_goods/applications', { body }); }
  /** [未实测] 撤回审核申请 */
  revokeApplication(body) { return this.request('PUT', '/api/show_goods/applications/revoke', { body }); }
  revokeApplicationDelete(body) { return this.request('DELETE', '/api/show_goods/applications/revoke', { body }); }
  /** [未实测] 申请成为原创作者 */
  applyAuthor(body) { return this.request('POST', '/api/show_goods/author/applying', { body }); }
  authorState() { return this.request('GET', '/api/show_goods/author/state'); }
  expectedIncome(opts = {}) { return this.request('GET', '/api/show_goods/expected_income', { query: opts }); }

  /** 商城在售作品列表 */
  goodses({ limit = 72, page = 0, show_type = 'paper', search, tag_id, tag_name, sort, ...rest } = {}) {
    return this.request('GET', '/api/show_goods/goodses', { query: { limit, page, show_type, search, tag_id, tag_name, sort, ...rest } });
  }
  showGoodsTagsTree({ show_type = 'paper', tag_level_from = 2, tag_level_to = 0, ...rest } = {}) {
    return this.request('GET', '/api/show_goods/tags_tree', { query: { show_type, tag_level_from, tag_level_to, ...rest } });
  }
  /** [未实测] 改价 */
  changeGoodsPrice(body) { return this.request('PUT', '/api/show_goods/goodses/change_price', { body }); }
  /** [未实测] 下架 */
  stopGoodsSale(body) { return this.request('PUT', '/api/show_goods/goodses/stopSale', { body }); }
  /** [未实测] 给商品打标签 */
  assignGoodsTags(body) { return this.request('PUT', '/api/show_goods/goodses/assign_tags', { body }); }

  myGoodses(opts = {}) { return this.request('GET', '/api/show_goods/my/goodses', { query: opts }); }
  /** [未实测] 上架作品 */
  putGoodsOnSale(body) { return this.request('POST', '/api/show_goods/my/goodses', { body }); }
  myIncomes(opts = {}) { return this.request('GET', '/api/show_goods/my/incomes/goodses', { query: opts }); }
  /**
   * 某个商品的信息。bundle：`GET /api/show_goods/my/info/{show_goods_id}?include=…`
   * —— 无参的 `/api/show_goods/my/info` 实测 404，商品 id 是路径段。
   */
  myGoodsInfo(show_goods_id, { include = [] } = {}) {
    if (show_goods_id === undefined) throw new Error('myGoodsInfo(show_goods_id, …)：缺少商品 id');
    return this.request('GET', `/api/show_goods/my/info/${show_goods_id}`, { query: { include: [].concat(include) } });
  }
  myApplications(opts = {}) { return this.request('GET', '/api/show_goods/my/applications', { query: opts }); }
  myPurchased(opts = {}) { return this.request('GET', '/api/show_goods/my/purchased/goodses', { query: opts }); }
  myPurchasedState(opts = {}) { return this.request('GET', '/api/show_goods/my/purchased/state', { query: opts }); }
  /** [未实测] 购买作品 */
  purchaseGoods(body) { return this.request('POST', '/api/show_goods/purchased/goodses', { body }); }
  /** [未实测] 从已购商品创建自己的作品：POST /api/show_goods/purchased/goodses/{id}/show */
  createShowFromPurchasedGoods(id) { return this.request('POST', `/api/show_goods/purchased/goodses/${id}/show`, { body: {} }); }
  officialRecommended(opts = {}) { return this.request('GET', '/api/show_goods/official_recommended', { query: opts }); }
  showGoodsRank(opts = {}) { return this.request('GET', '/api/show_goods/rank', { query: opts }); }
  tplGoodsBoughtState(opts = {}) { return this.request('GET', '/api/show_goods/tpl_goods/bought/state', { query: opts }); }
  tplGoodsCount(opts = {}) { return this.request('GET', '/api/show_goods/tpl_goods/count', { query: opts }); }

  // ---- 商城收藏 show_goods_favorites

  goodsFavorites(opts = {}) { return this.request('GET', '/api/show_goods_favorites', { query: opts }); }
  /** [未实测] 取消收藏 */
  removeGoodsFavorite(id) { return this.request('DELETE', `/api/show_goods_favorites/${id}`); }
  isGoodsFavorite(id) { return this.request('GET', `/api/show_goods_favorites/is_favorite/${id}`); }

  // ---- 商城收藏标签 show_goods_favorite_tags

  /**
   * 商城收藏的标签。bundle 的工厂基址是 `/api/show_goods_favorite_tags`，
   * 但**裸 GET 该基址实测 404** —— 真实入口都带维度，见
   * `goodsFavoriteTagState` / `goodsFavoriteTagOrder` / `goodsFavoriteTagOrderMap`。
   * 这里保留 `show_type` 形参以匹配服务端；不带维度时请用上面三个。
   */
  goodsFavoriteTags({ show_type } = {}) {
    return this.request('GET', '/api/show_goods_favorite_tags', { query: { show_type } });
  }
  goodsFavoriteTagShows(show_type, tag_id, opts = {}) {
    return this.request('GET', `/api/show_goods_favorite_tags/${show_type}/${tag_id}/show_goods`, { query: opts });
  }
  goodsFavoriteTagOrder(show_type = 'paper') { return this.request('GET', `/api/show_goods_favorite_tags/${show_type}/order`); }
  /** [未实测] 设置收藏标签顺序 */
  setGoodsFavoriteTagOrder(show_type, order) {
    return this.request('POST', `/api/show_goods_favorite_tags/${show_type}/order`, { body: { order: JSON.stringify(order) } });
  }
  goodsFavoriteTagOrderMap(show_type = 'paper') { return this.request('GET', `/api/show_goods_favorite_tags/${show_type}/tagorder`); }
  /** [未实测] 收藏标签重命名 */
  renameGoodsFavoriteTag(body) { return this.request('POST', '/api/show_goods_favorite_tags/rename', { body }); }
  goodsFavoriteTagState(show_type) { return this.request('GET', `/api/show_goods_favorite_tags/show_type/${show_type}`); }
  /** [未实测] 删收藏标签 */
  removeGoodsFavoriteTag(show_type, tag_id) {
    return this.request('DELETE', `/api/show_goods_favorite_tags/show_type/${show_type}/${tag_id}`);
  }
  goodsFavoriteTagItems(show_goods_id, tag_id) {
    return this.request('GET', `/api/show_goods_favorite_tags/show_goods/${show_goods_id}/${tag_id}`);
  }
  /** [未实测] 从收藏标签里移除某商品 */
  removeGoodsFromFavoriteTag(show_goods_id, tag_id, id3) {
    return this.request('DELETE', `/api/show_goods_favorite_tags/show_goods/${show_goods_id}/${tag_id}/${id3}`);
  }
  /** [未实测] 标记收藏标签已读 */
  markGoodsFavoriteTagsRead(body = {}) { return this.request('POST', '/api/show_goods_favorite_tags/state/read', { body }); }

  // ---------------------------------------------------------------- 个人主页 user_home
  //
  // ★ 关键：不存在 `GET /api/user_home`（实测 404）。主页数据全部挂在具体用户上。
  //   bundle 证据（depot/services/userExhibitsManager）：
  //     getPublishedUser(uid)        → GET /api/user_home/published/user/{uid}/info
  //     getPublishedUserBySid(sid)   → GET /api/user_home/published/user/{sid}/on_page
  //     getPublishedUserExhibits(uid)→ GET /api/user_home/published/user/{uid}/exhibits?limit&page

  /**
   * 他人主页基本信息。`uid` 必须是 **unique_uid**。
   * 实测：传 user_sid 会 `Common:Failed_NotFound: unique_uid`。
   * （分享链接那种「用会话看主页」走 `publishedUserBySid`。）
   */
  publishedUser(uid) { return this.request('GET', `/api/user_home/published/user/${uid}/info`); }
  /** 通过**会话 sid**看主页（分享链接落地用）。注意不是 unique_uid，传 uid 会 400。 */
  publishedUserBySid(user_sid) { return this.request('GET', `/api/user_home/published/user/${user_sid}/on_page`); }
  /** 他人主页的作品列表。uid = unique_uid */
  publishedUserExhibits(uid, { limit, page } = {}) {
    return this.request('GET', `/api/user_home/published/user/${uid}/exhibits`, { query: { limit, page } });
  }
  /** 他人主页「展示」区作品。uid = unique_uid */
  publishedUserExhibitsOnMyPage(uid, { limit, page } = {}) {
    return this.request('GET', `/api/user_home/published/user/${uid}/exhibits/on_mypage`, { query: { limit, page } });
  }
  getPublishedUser(uid) { return this.publishedUser(uid); }
  getPublishedUserExhibits(uid, opts) { return this.publishedUserExhibits(uid, opts); }

  /** [未实测] 改主页信息。bundle 签名：put("/api/user_home/my/info", {name, desc}) */
  updateMyHomeInfo(name, desc) { return this.request('PUT', '/api/user_home/my/info', { body: { name, desc } }); }
  /**
   * 某人「已售出」的作品。
   * bundle：new URI("/api/user_home/sold/user/"+uid).search({access_token,start_date,end_date,limit,page_width,page_height})
   */
  soldShows(uid, { access_token, start_date, end_date, limit, page_width, page_height } = {}) {
    return this.request('GET', `/api/user_home/sold/user/${uid}`, {
      query: { access_token, start_date, end_date, limit, page_width, page_height },
    });
  }

  /** 粉丝列表。bundle：new URI("/api/user_home/followers").search({page,limit}) */
  followers({ page = 0, limit = 12 } = {}) { return this.request('GET', '/api/user_home/followers', { query: { page, limit } }); }
  // ★ 关注族：不存在 `GET /api/user_home/follow`（实测 404）。真实形态都带被关注者的 uid。
  //   bundle：getFollowStateOfAuthor → GET /api/user_home/follow/{uid}
  //           followAuthor          → POST /api/user_home/follow/{uid}/on
  //           unFollowAuthor        → POST /api/user_home/follow/{uid}/off
  //           getFansCount          → GET /api/user_home/{uid}/fans
  /** 是否已关注某人 */
  followState(uid) { return this.request('GET', `/api/user_home/follow/${uid}`); }
  /** [未实测] 关注 */
  follow(uid) { return this.request('POST', `/api/user_home/follow/${uid}/on`, { body: {} }); }
  /** [未实测] 取关 */
  unfollow(uid) { return this.request('POST', `/api/user_home/follow/${uid}/off`, { body: {} }); }
  /** 某人的粉丝数 */
  fansCount(uid) { return this.request('GET', `/api/user_home/${uid}/fans`); }
  /** [未实测] 关注 / 取关 */
  setFollow(body) { return this.request('POST', '/api/user_home/follow', { body }); }

  // 展位：bundle 里只有 POST(新增) / DELETE(移除，走 query) / POST /orders(排序)，
  // **没有 GET**（已上架展位随 /api/user_home/published/user/{uid}/exhibits/on_mypage 读）。
  /** [未实测] 上架到主页展位。bundle：post("/api/user_home/my/published/exhibits",{show_id}) */
  addExhibit(show_id) { return this.request('POST', '/api/user_home/my/published/exhibits', { body: { show_id } }); }
  /** [未实测] 下架展位。bundle：URI("/api/user_home/my/published/exhibits").search({show_id}) + delete */
  removeExhibit(show_id) { return this.request('DELETE', '/api/user_home/my/published/exhibits', { query: { show_id } }); }
  /** [未实测] 展位排序。bundle：post(...,{ordered_exhibits:[{show_id}|{show_goods_id}]}) */
  orderExhibits(ordered_exhibits) {
    return this.request('POST', '/api/user_home/my/published/exhibits/orders', { body: { ordered_exhibits } });
  }

  // 主页标签族（depot/services/userExhibitsTagManager，base = /api/user_home/tag）
  // ★ 不存在 `GET /api/user_home/tag`（实测 404）；标签清单走 /tag/tags/{uid}/{tag}。
  /** 某人的主页标签（tag 默认 'all'） */
  /** 某人的主页标签（tag 默认 'all'）。uid 必须是 **unique_uid**（传 user_sid 会 Failed_NotFound）。 */
  homeTags(uid, tag = 'all') { return this.request('GET', `/api/user_home/tag/tags/${uid}/${encodeURIComponent(tag)}`); }
  /** 某人主页标签的排序映射 */
  /** 某人主页标签的排序映射。uid = **unique_uid**。 */
  homeTagOrderMap(uid) { return this.request('GET', `/api/user_home/tag/tagorder/${uid}`); }
  /** [未实测] 主页标签排序。bundle：post("/api/user_home/tag/order", {order}) */
  setHomeTagsOrder(order) { return this.request('POST', '/api/user_home/tag/order', { body: { order } }); }
  /** [未实测] 主页标签改名。bundle 是 **POST**，body {old_tag,new_tag} */
  renameHomeTag(old_tag, new_tag) { return this.request('POST', '/api/user_home/tag/rename', { body: { old_tag, new_tag } }); }
  /** [未实测] 新建主页标签。bundle：{published_shows_id, tag} */
  addHomeTag(published_shows_id, tag) {
    return this.request('POST', '/api/user_home/tag/add', { body: { published_shows_id, tag: encodeURIComponent(tag) } });
  }
  /** [未实测] 清空某标签。bundle 是 **DELETE** */
  clearHomeTag(tag) { return this.request('DELETE', `/api/user_home/tag/clear/${encodeURIComponent(tag)}`); }
  /** [未实测] 删除主页标签。bundle：delete("/api/user_home/tag/remove/"+uid+"/"+tag) */
  removeHomeTag(uid, tag) {
    return this.request('DELETE', `/api/user_home/tag/remove/${uid}/${encodeURIComponent(tag)}`);
  }
  /** 某标签下的作品。bundle：new URI("/api/user_home/tag/shows/"+uid+"/"+tag).search({limit,page}) */
  homeTagShows(uid, tag, { limit = 20, page = 0 } = {}) {
    return this.request('GET', `/api/user_home/tag/shows/${uid}/${encodeURIComponent(tag)}`, { query: { limit, page } });
  }
  /** [未实测] 从主页标签移除作品 */
  removeShowFromHomeTag(uid, tag) {
    return this.request('DELETE', `/api/user_home/tag/shows/${uid}/${encodeURIComponent(tag)}`);
  }

  // ---------------------------------------------------------------- 保存记录 / 作品辅助

  saveToRecords(opts = {}) { return this.request('GET', '/api/show_save_to_records', { query: opts }); }
  saveToRecordsCount(opts = {}) { return this.request('GET', '/api/show_save_to_records/count', { query: opts }); }
  showRoot(opts = {}) { return this.request('GET', '/api/show', { query: opts }); }
  /** [未实测] 采集图片（站内图片收集） */
  collectImage(show_id, body = {}) { return this.request('POST', `/api/show/collect_img/${show_id}`, { body }); }
  /** [未实测] 图片侵权扫描 */
  scanImageInfringement(show_id, body = {}) { return this.request('POST', `/api/show/scan_image_infringement/${show_id}`, { body }); }
  /** [未实测] 旧版碎片删除 */
  deleteLegacyFragment(body) { return this.request('DELETE', '/api/fragment', { body }); }
  /** [未实测] HTML 代码校验（编辑器自定义 HTML 组件用） */
  verifyHtmlCode(html) { return this.request('POST', '/api/htmlCode/verify', { body: { html } }); }
  /** 作品统计（另一个入口） */
  statisticsShow(show_id, { count = 30 } = {}) {
    return this.request('GET', `/api/statistics/show/${show_id}/daily`, { query: { count } });
  }
  homeSlogans() { return this.request('GET', '/api/home_slogans'); }
  /**
   * 邀请页信息。bundle：`GET /api/invitation/{salt_code}` —— 无参实测 404，邀请码是路径段。
   * @param {string} salt_code 邀请链接里的 salt_code
   */
  invitation(salt_code) {
    if (!salt_code) throw new Error('invitation(salt_code)：邀请码是路径段，不能省略');
    return this.request('GET', `/api/invitation/${encodeURIComponent(salt_code)}`);
  }
  userCoin() { return this.request('GET', '/api/user/info/coin'); }
  userInvitation() { return this.request('GET', '/api/user/info/invitation'); }
  /** [未实测] 提交反馈/工单 */
  submitIssue(body) { return this.request('POST', '/api/issues', { body }); }
  /** 举报处理结果 */
  reportResult(ok = true) { return this.request('GET', `/auth/report/result/${ok ? 'success' : 'failed'}`); }
  authSuccess() { return this.request('GET', '/auth/success'); }

  // ---------------------------------------------------------------- 团队写操作

  /** [未实测] 建团队 */
  createTeam(body) { return this.request('POST', '/api/teams', { body }); }
  /** [未实测] 改团队 */
  updateTeam(body) { return this.request('PUT', '/api/teams', { body }); }
  /** [未实测] 解散团队 */
  removeTeam(body = {}) { return this.request('DELETE', '/api/teams', { body }); }
  teamSubAccounts(team_id, opts = {}) { return this.request('GET', `/api/teams/${team_id}/sub_account`, { query: opts }); }

  // ---------------------------------------------------------------- 站内管理（普通账号无权限，仅登记）

  /** [未实测] 站内模板管理，普通账号应为 403 */
  adminCreateTemplate(body) { return this.request('POST', '/api/admin/template/meta', { body }); }
  adminTagNew(opts = {}) { return this.request('GET', '/api/admin/template/system/tag/new', { query: opts }); }
  adminTagDrop(opts = {}) { return this.request('GET', '/api/admin/template/system/tag/drop', { query: opts }); }

  // ================================================================
  // 残差补全（第二轮）：把审计剩下的未覆盖接口补齐。
  // 大部分是 [未实测]；涉及资金/短信/删除的调用前请自带可逆性保护。
  // ================================================================

  // ---------------------------------------------------------------- 素材：文件上传族
  // 这些是 COS/OSS 直传的内部步骤，不是「一条请求就传完」。
  // 大图/视频走：取 token → 直传对象存储 → 用 /cosobj 或 /ossobj 登记。

  /** [未实测] 上传图片（multipart 文件形态，区别于 uploadImageBase64） */
  uploadImageFile(file, { team_id } = {}) { return this.request('POST', '/api/assets/image/file', { body: file, query: { team_id }, form: true }); }
  /** [未实测] 上传视频 */
  uploadVideoFile(file, { team_id } = {}) { return this.request('POST', '/api/assets/video/file', { body: file, query: { team_id }, form: true }); }
  /** [未实测] 登记已直传到 COS 的视频对象 */
  registerCosVideo(body) { return this.request('POST', '/api/assets/video/cosobj', { body }); }
  /** [未实测] 登记已直传到 OSS 的视频对象 */
  registerOssVideo(body) { return this.request('POST', '/api/assets/video/ossobj', { body }); }
  /** [未实测] 通过 CDN 通道上传图片文件 */
  uploadCdnImage(file, opts = {}) { return this.request('POST', '/api/upload-cdn/image/file', { body: file, query: opts, form: true }); }
  /** [未实测] 从任意存储导入图片 */
  importImageFromAnyStorage(body) { return this.request('POST', '/api/assets/image/fromAnyStorage', { body }); }
  /** [未实测] 保存编辑器内联图片数据 */
  saveInlineImageData(body) { return this.request('POST', '/api/assets/image/imagedata', { body }); }
  /** [未实测] 上传 SVG 内容 */
  uploadSvgContent(body) { return this.request('POST', '/api/assets/image/svgContent', { body }); }
  /** [未实测] 外链图片（同 addImageOutlink，保留别名） */
  outlinkImage(body) { return this.request('POST', '/api/assets/image/outlink', { body }); }
  /** [未实测] 微信图片链接转存 */
  imageFromWxLink(body) { return this.request('POST', '/api/assets/image/wxlink', { body }); }
  /** [未实测] 地图截图转存 */
  imageFromQqMap(body) { return this.request('POST', '/api/assets/image/qqmap', { body }); }
  /** [未实测] 取 PSD 源文件 */
  psdFile(opts = {}) { return this.request('GET', '/api/assets/psd/file', { query: opts }); }
  /** [未实测] 取音频文件 */
  audioFile(opts = {}) { return this.request('GET', '/api/assets/audio/file', { query: opts }); }
  /** [未实测] 删除证件文件 */
  deleteCertFile(body = {}) { return this.request('DELETE', '/api/assets/cert/file', { body }); }
  /** [未实测] 批量打标签 */
  setAssetsTags(body) { return this.request('POST', '/api/assets/tagsset', { body }); }

  // ---- 图片标签族（tagsorder 有 GET/POST 两个方向）

  /** 图片标签顺序 */
  imageTagsOrder({ team_id } = {}) { return this.request('GET', '/api/assets/type/image/tagsorder', { query: { team_id } }); }
  /** [未实测] 设置图片标签顺序。bundle：post("/api/assets/type/image/tagsorder",{order,team_id}) */
  /** 图片标签顺序。order 必须是字符串（数组会被服务端拒），这里自动转换。 */
  setImageTagsOrder(order, { team_id } = {}) {
    return this.request('POST', '/api/assets/type/image/tagsorder', { body: { order: asOrder(order), team_id } });
  }
  /** 某个素材自己身上的标签。bundle：get("/api/assets/"+asset_id+"/tags") */
  getImageTags(asset_id) { return this.request('GET', `/api/assets/${asset_id}/tags`); }
  /**
   * 给某个素材打标签（**标签是挂在素材上的**，不是账号级的）。
   * bundle：post("/api/assets/"+asset_id+"/tags", {tag: encodeURIComponent(tag)})
   */
  addImageTag(asset_id, tag) {
    return this.request('POST', `/api/assets/${asset_id}/tags`, { body: { tag: encodeURIComponent(tag) } });
  }
  /**
   * 摘掉某个素材上的某个标签。
   * ⚠️ 不是 `DELETE /api/assets/{id}/tags/{tag}` —— 那条实测 404（bundle 里那么写，
   * 但服务端没挂）。真实可用的是 **DELETE 到集合路径、tag 放在 query/body 里**：
   * `DELETE /api/assets/{asset_id}/tags`，实测返回 "Deleted" 且 getImageTags 立刻变空。
   */
  removeImageTag(asset_id, tag) {
    return this.request('DELETE', `/api/assets/${asset_id}/tags`, { body: { tag: encodeURIComponent(tag) } });
  }
  /** 账号级标签列表（含每个标签下的素材）。 */
  imageTagDetails({ team_id } = {}) { return this.request('GET', '/api/assets/type/image/tags', { query: { team_id } }); }
  /** [未实测] 清空全部图片标签 */
  clearImageTags({ team_id } = {}) { return this.request('DELETE', '/api/assets/type/image/tags', { query: { team_id } }); }
  /**
   * 删某个账户级图片标签。
   * bundle：delete("/api/assets/type/image/tag/"+encodeURIComponent(tag)) —— tag 在**路径段**上，
   * 不是 query。早先的版本漏了这一段，实测 404。
   */
  deleteImageTag(tag, { team_id } = {}) {
    return this.request('DELETE', `/api/assets/type/image/tag/${encodeURIComponent(tag)}`, { query: { team_id } });
  }
  /** 账户级标签重命名。bundle：post("/api/assets/type/image/tag/rename", {old_tag, new_tag, team_id}) */
  renameImageTag(old_tag, new_tag, { team_id } = {}) {
    return this.request('POST', '/api/assets/type/image/tag/rename', { body: { old_tag, new_tag, team_id } });
  }
  imageTagAssets(opts = {}) { return this.request('GET', '/api/assets/type/image/tag/assets', { query: opts }); }
  imageUntags({ team_id } = {}) { return this.request('GET', '/api/assets/type/image/untags', { query: { team_id } }); }
  /** [未实测] 清空未打标签的图片 */
  clearImageUntags({ team_id } = {}) { return this.request('DELETE', '/api/assets/type/image/untags/clearimages', { query: { team_id } }); }
  /** [未实测] 清空某标签下的图片 */
  clearImagesInTag(tag, { team_id } = {}) {
    return this.request('DELETE', `/api/assets/type/image/tags/${encodeURIComponent(tag)}/clearimages`, { query: { team_id } });
  }

  // ---------------------------------------------------------------- 消息：已读标记

  /** [未实测] 标记消息已读。bundle：post("/api/messages/{id}/state/read") */
  markMessageRead(message_id) { return this.request('POST', `/api/messages/${message_id}/state/read`, { body: {} }); }

  // ---------------------------------------------------------------- 发票

  invoicesCount() { return this.request('GET', '/api/invoices/count'); }
  invoicesLast() { return this.request('GET', '/api/invoices/lastinvoice'); }
  invoicesAvailable({ include = [] } = {}) { return this.request('GET', '/api/invoices/available', { query: { include } }); }
  invoice(id) { return this.request('GET', `/api/invoices/${id}`); }
  /** [未实测] 申请开票 */
  requireInvoice(body) { return this.request('POST', '/api/invoices/require', { body }); }
  /** [未实测] 撤销开票申请 */
  revokeInvoice(body = {}) { return this.request('DELETE', '/api/invoices/revoke', { body }); }
  /** [未实测] 新建/修改发票信息 */
  saveInvoice(body) { return this.request('POST', '/api/invoices', { body }); }
  updateInvoice(body) { return this.request('PUT', '/api/invoices', { body }); }
  deleteInvoice(body = {}) { return this.request('DELETE', '/api/invoices', { body }); }

  // ---------------------------------------------------------------- 订单：下单族
  // 全部 [未实测]，都会产生真实订单/资金动作 —— 不要随手调。

  /** [未实测] 通用下单 */
  createOrder(body) { return this.request('POST', '/api/orders', { body }); }
  /** [未实测] 支付订单 */
  payOrder(body) { return this.request('POST', '/api/orders/for/order_pay', { body }); }
  /** [未实测] 钱包充值 */
  rechargeWallet(body) { return this.request('POST', '/api/orders/for/wallet_recharge', { body }); }
  /** [未实测] 兑换码充值 */
  redeemWallet(body) { return this.request('POST', '/api/orders/for/wallet_redeem', { body }); }
  /** [未实测] 余额转账 */
  transferWallet(body) { return this.request('POST', '/api/orders/for/wallet_transfer', { body }); }
  /** [未实测] 提现 */
  withdrawCash(body) { return this.request('POST', '/api/orders/for/withdraw_cash', { body }); }
  /** [未实测] 购买商城作品下单 */
  orderShowGoods(body) { return this.request('POST', '/api/orders/for/show_goods', { body }); }
  /** [未实测] 购买模板商品下单 */
  orderTplShowGoods(body) { return this.request('POST', '/api/orders/for/tpl_show_goods', { body }); }
  /** [未实测] 企业团队下单 */
  orderEnterpriseTeam(team_id, body) { return this.request('POST', `/api/orders/for/enterprise_team/${team_id}`, { body }); }
  /** [未实测] 团队钱包转账 */
  transferTeamWallet(body) { return this.request('POST', '/api/orders/for/team_wallet_transfer', { body }); }
  /** 会员升级价目 */
  tariffLevelUpgrading(opts = {}) { return this.request('GET', '/api/orders/tariff/for/level/upgrading', { query: opts }); }
  /** 模板会员升级价目 */
  tariffTplMembershipUpgrading(opts = {}) { return this.request('GET', '/api/orders/tariff/for/templated_membership/upgrading', { query: opts }); }
  /** 流量包价目 */
  tariffTrafficPackage(opts = {}) { return this.request('GET', '/api/orders/tariff/for/traffic_package', { query: opts }); }
  /** 企业团队价目 */
  tariffEnterpriseTeam(team_id, opts = {}) { return this.request('GET', `/api/orders/tariff/for/enterprise_team/${team_id}`, { query: opts }); }
  /** 单个订单详情 */
  order(order_id) { return this.request('GET', `/api/orders/${order_id}`); }
  /** [未实测] 关闭订单。bundle：post("/api/orders/"+order_id+"/close") */
  closeOrder(order_id) { return this.request('POST', `/api/orders/${order_id}/close`, { body: {} }); }
  /** 当前用户能否下单（风控/欠费等） */
  canCreateOrder() { return this.request('GET', '/api/orders/for/create_order'); }
  /** 特价信息 */
  specialOffer() { return this.request('GET', '/api/orders/for/special_offer'); }
  /** 团队钱包明细 */
  teamWalletDetail(team_id) { return this.request('GET', `/api/orders/for/team_wallet_detail/${team_id}`); }
  /** 团队钱包订单流水 */
  teamWalletOrder(team_id, { limit = 10, page = 0 } = {}) {
    return this.request('GET', `/api/orders/for/team_wallet/${team_id}`, { query: { offset: page * limit, limit } });
  }
  /** 企业团队（旧入口） */
  orderEnterpriseTeamLegacy(opts = {}) { return this.request('GET', '/api/orders/for/enterprise_team', { query: opts }); }

  // ---------------------------------------------------------------- 团队钱包
  // ★ 每个团队钱包都要带 team_id；不带 id 的只有 team_balance（返回团队列表）。

  /** 某团队钱包余额。bundle：get("/api/wallet/team/balance/"+team_id) */
  teamBalance(team_id) { return this.request('GET', `/api/wallet/team/balance/${team_id}`); }
  /** 我加入的全部团队及其钱包（bundle：get("/api/wallet/team_balance")） */
  teamWallets() { return this.request('GET', '/api/wallet/team_balance'); }
  /** 某团队钱包流水 */
  teamBills(team_id, { limit = 20, page = 0 } = {}) {
    return this.request('GET', `/api/wallet/team/bills/${team_id}`, { query: { limit, page } });
  }

  // ---------------------------------------------------------------- 通讯录

  /** [未实测] 改联系人 */
  updateContact(body) { return this.request('POST', '/api/contacts/update', { body }); }
  /** [未实测] 删联系人 */
  deleteContact(body = {}) { return this.request('DELETE', '/api/contacts', { body }); }

  // ---------------------------------------------------------------- 表单残余

  formsCount(opts = {}) { return this.request('GET', '/api/forms/count', { query: opts }); }
  updateFormCount(body) { return this.request('PUT', '/api/forms/count', { body }); }
  deleteFormCount(body = {}) { return this.request('DELETE', '/api/forms/count', { body }); }
  deleteFormData(body = {}) { return this.request('DELETE', '/api/forms/data/forshow', { body }); }

  // ---------------------------------------------------------------- 作品残余

  trafficPackageShows(opts = {}) { return this.request('GET', '/api/shows/consume/traffic_package/shows', { query: opts }); }
  officialShowsLegacy(opts = {}) { return this.request('GET', '/api/shows/from/official', { query: opts }); }
  teamShowsCount(opts = {}) { return this.request('GET', '/api/shows/from/teams/count', { query: opts }); }
  /** [未实测] 清空某标签下全部作品的标签 */
  clearTagAll(body) { return this.request('POST', '/api/shows/tags/clear', { body }); }
  /** [未实测] 标签重命名（方法原提取为 DELETE，bundle 里是 POST） */
  renameTagLegacy(body) { return this.request('DELETE', '/api/shows/tags/rename', { body }); }
  /** [未实测] 商城收藏标签：删标签 */
  deleteGoodsFavoriteTag(show_type, tag_id) {
    return this.request('DELETE', `/api/show_goods_favorite_tags/${show_type}/${tag_id}/tags`);
  }
  /** [未实测] 商城收藏标签：按 paper 维度设顺序 */
  setGoodsFavoriteTagOrderPaper(order) {
    return this.request('POST', '/api/show_goods_favorite_tags/paper/order', { body: { order: JSON.stringify(order) } });
  }
  /** [未实测] 模板是否允许被使用 */
  templateAllowed(body) { return this.request('POST', '/api/templates/allowed', { body }); }
  /** [未实测] 碎片标签顺序（按 type/category 字面量） */
  fragmentTagsOrderLiteral(type = 'paper', category = 'comp') {
    return this.request('POST', `/api/fragments/v5/${type}/${category}/tagsorder`, { body: {} });
  }

  // ---------------------------------------------------------------- 合作方应用（partner app）
  // 秀米开放平台/服务商侧接口。普通消费者账号调用应为 403，此处完整登记。
  // 全部 [未实测]。

  partnerInfo(opts = {}) { return this.request('GET', '/api/auth/partnerinfo', { query: opts }); }
  /** 我的合作方绑定关系 */
  partnerBind(opts = {}) { return this.request('GET', '/api/auth/partner/partnerbind', { query: opts }); }
  /** 合作方应用绑定关系（当前身份是被绑定方） */
  partnerAppBind(opts = {}) { return this.request('GET', '/api/auth/partner/partnerappbind', { query: opts }); }
  partnerAppBindList(opts = {}) { return this.request('GET', '/api/auth/partner/partnerappbindlist', { query: opts }); }
  /** 我作为合作方拥有的应用列表 */
  ownerPartnerApp(opts = {}) { return this.request('GET', '/api/auth/partner/ownerpartnerapp', { query: opts }); }
  partnerAppApplications(opts = {}) { return this.request('GET', '/api/auth/partner/partnerapp/applications', { query: opts }); }
  /** [未实测] 申请/绑定合作方应用 */
  addPartnerApp(body) { return this.request('POST', '/api/auth/partner/partnerapp', { body }); }
  /** [未实测] 修改合作方应用 */
  updatePartnerApp(body) { return this.request('PUT', '/api/auth/partner/partnerapp', { body }); }
  /** [未实测] 删除合作方应用 */
  deletePartnerApp(body = {}) { return this.request('DELETE', '/api/auth/partner/partnerapp', { body }); }
  /** [未实测] 重置 AppSecret */
  resetPartnerAppSecret(body) { return this.request('PUT', '/api/auth/partner/partnerapp/resetsecret', { body }); }
  /** [未实测] 解绑合作方应用 */
  unbindPartnerApp(body = {}) { return this.request('DELETE', '/api/auth/partner/partnerapp/unbind', { body }); }
  /** [未实测] 作为合作方解除对自己应用的绑定 */
  unbindOwnerPartnerApp(body = {}) { return this.request('DELETE', '/api/auth/partner/partnerapp/ownerunbind', { body }); }
  ownerPartnerAppDetail(opts = {}) { return this.request('GET', '/api/auth/partner/partnerapp/ownerpartnerapp', { query: opts }); }

  // ---------------------------------------------------------------- 账号注册 / 重置残余

  /** [未实测] 手机号注册（与 sms/register_user 并存的两套入口之一） */
  registerPhone(body) { return this.request('POST', '/api/auth/register_phone', { body }); }
  /** [未实测] 重置密码（无验证渠道信息的通用入口） */
  resetPassword(body) { return this.request('POST', '/api/auth/reset_password', { body }); }
  /** [未实测] 邮箱重置密码（auth 命名空间下的另一个入口） */
  emailResetPasswordAuth(body) { return this.request('POST', '/api/auth/email/reset_password', { body }); }
}

export default Xiumi;
