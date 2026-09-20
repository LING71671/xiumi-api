// gen_docs.mjs — 合并「静态提取 + 实时流量 + 只读探测」，生成全站 API 文档
// 输出: data/catalog.json  data/catalog.csv  docs/*.md  README.md
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './cfg.mjs';

const DATA = path.join(ROOT, 'data');
const DOCS = path.join(ROOT, 'docs');
fs.mkdirSync(DOCS, { recursive: true });

const read = (f, dflt) => (fs.existsSync(path.join(DATA, f)) ? JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')) : dflt);
const staticEp = read('endpoints.json', { endpoints: [] });
const liveEp = read('live_endpoints.json', { endpoints: [] });
const probe = read('probe_results.json', { results: [] });
const schemas = read('schemas.json', { fields: [] });

// ---------- 模块说明 ----------
const MODULES = {
  auth: '登录 / 注册 / 第三方绑定 / 开放平台（`/api/auth/*` 与站点级 `/auth/*`）',
  login_history: '登录历史记录',
  user: '账号资料、密码、手机/邮箱绑定、黑名单、米点、邀请',
  user_setting: '个人主页外观设置（背景、配色、水印、接收类型）',
  user_home: '个人主页：关注/粉丝、标签、投稿展位、售卖统计',
  apikey: '开放 API 密钥管理',
  assets: '素材库：图片/音频/视频上传、标签分类、CDN 直传',
  upload: '上传凭证（普通上传）',
  'upload-cdn': '上传凭证（COS/CDN 直传）',
  shows: '作品（图文 / H5 / 表单 / 海报）：列表、新建、删除、回收站、标签、导入微信文章',
  show: '单个作品的即时操作（V5 保存入口）',
  templates: '模板库：模板列表、标签树、可用模板',
  fragment: '素材片段（单个）',
  fragments: '素材片段（列表、上传、已用）',
  forms: '表单型 H5：表单数据查询、导出、字段设置',
  comments: '评论系统：评论读写、权限、回收站、分享令牌',
  audio: '音频素材库：分类、来源、列表',
  fonts: '字体（有字库 webfont 接口）',
  nlp: '文本智能处理（标题提取）',
  renderer: '服务端渲染/导出：截图、GIF、视频、PDF、帧图',
  qrimage: '二维码图片生成任务',
  qrshare: '二维码分享（作品分享图）',
  shop: '模板商城入口',
  show_goods: '模板商城：商品、上架、投稿、收入',
  show_goods_favorites: '商品收藏',
  show_goods_favorite_tags: '收藏夹分组标签',
  show_save_to_records: '作品保存记录',
  orders: '订单与支付：下单、支付、充值、转账、提现、企业团队账单',
  wallet: '钱包：余额、米点账单、团队钱包',
  invoices: '发票申请与管理',
  teams: '团队 / 企业版 / 子账号',
  members: '团队成员',
  contacts: '联系人',
  messages: '消息与通知设置',
  notify: '系统通知推送',
  sms: '短信验证码',
  email: '邮箱验证与修改',
  custom_domains: '自定义域名（团队/作品）',
  statistics: '数据统计（作品访问）',
  publisher: '发布者身份',
  admin: '管理端：模板元数据与系统标签（普通用户不可用）',
  help: '帮助中心：搜索、推荐、校验',
  htmlCode: 'HTML 代码校验',
  issues: '问题反馈',
  home_slogans: '首页标语',
  sys_info: '系统配置与限制值',
  invitation: '邀请注册',
  other: '其它/未归类',
};

// ---------- 合并 ----------
const catalog = new Map();
const keyOf = (p, m) => `${m} ${p}`;

for (const e of staticEp.endpoints) {
  if (!catalog.has(e.path)) {
    catalog.set(e.path, {
      path: e.path, methods: {}, params: new Set(), query: new Set(),
      module: e.module, sources: new Set(), liveUrls: [], probe: null, exampleResponse: null,
      callSamples: [],
    });
  }
  const c = catalog.get(e.path);
  c.sources.add('bundle');
  for (const m of e.methods) c.methods[m] = c.methods[m] || { source: 'bundle' };
  for (const p of e.params || []) c.params.add(p);
  for (const q of e.query || []) c.query.add(q);
  for (const s of e.samples || []) if (c.callSamples.length < 3) c.callSamples.push(s);
}

for (const e of liveEp.endpoints) {
  const p = e.path.replace(/\{(id|sid|hash)\}/g, (m) => m);
  if (!catalog.has(p)) {
    catalog.set(p, {
      path: p, methods: {}, params: new Set(), query: new Set(), module: p.split('/')[2] || 'other',
      sources: new Set(), liveUrls: [], probe: null, exampleResponse: null, callSamples: [],
    });
  }
  const c = catalog.get(p);
  c.sources.add('live');
  c.methods[e.method] = { ...(c.methods[e.method] || {}), source: 'live', statuses: e.statuses };
  for (const q of e.queryKeys) c.query.add(q);
  for (const b of e.bodyKeys) c.params.add(b);
  c.liveUrls = c.liveUrls.concat(e.sampleUrls || []).slice(0, 4);
  if (!c.exampleResponse && e.exampleResponse) c.exampleResponse = e.exampleResponse;
  c.calls = (c.calls || 0) + e.calls;
}

const probeByPath = new Map();
for (const r of probe.results) probeByPath.set(keyOf(r.path, 'GET'), r);

for (const c of catalog.values()) {
  const pr = probeByPath.get(keyOf(c.path, 'GET'));
  if (pr) c.probe = pr;
}

const rows = [...catalog.values()].map((c) => ({
  path: c.path,
  module: c.module,
  methods: Object.entries(c.methods).sort((a, b) => a[0].localeCompare(b[0])).map(([m, v]) => ({ method: m, evidence: v.source, statuses: v.statuses || null })),
  params: [...c.params].sort(),
  query: [...c.query].sort(),
  verified: c.sources.has('live') ? 'live' : (c.probe?.status ? 'probe' : 'bundle'),
  probe: c.probe ? { status: c.probe.status, envelope: c.probe.envelope, dataKeys: c.probe.dataKeys, sample: c.probe.sample, skipped: c.probe.skipped } : null,
  liveUrls: c.liveUrls,
  calls: c.calls || 0,
  exampleResponse: c.exampleResponse,
  callSamples: c.callSamples,
})).sort((a, b) => a.module.localeCompare(b.module) || a.path.localeCompare(b.path));

fs.writeFileSync(path.join(DATA, 'catalog.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  counts: {
    total: rows.length,
    live: rows.filter((r) => r.verified === 'live').length,
    probe2xx: rows.filter((r) => r.probe && r.probe.status >= 200 && r.probe.status < 300).length,
    bundle: rows.filter((r) => r.verified === 'bundle').length,
  },
  modules: MODULES,
  endpoints: rows,
}, null, 2));

// CSV
const csv = ['module,path,methods,verified,probe_status,params,query'];
for (const r of rows) {
  csv.push([r.module, r.path, r.methods.map((m) => m.method).join('|'), r.verified,
    r.probe?.status ?? '', r.params.join('|'), r.query.join('|')]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
}
fs.writeFileSync(path.join(DATA, 'catalog.csv'), '\uFEFF' + csv.join('\n'), 'utf8');

// ---------- docs/API-REFERENCE.md ----------
const VERIFY_LABEL = {
  live: '✅ 已实测（真实流量）',
  probe: '🟡 已探测（只读 GET）',
  bundle: '⚪ 仅静态（bundle 提取）',
};

const byModule = new Map();
for (const r of rows) {
  if (!byModule.has(r.module)) byModule.set(r.module, []);
  byModule.get(r.module).push(r);
}

let md = `# 秀米（xiumi.us）全站 API 参考

> 本文档由 \`scripts/gen_docs.mjs\` 自动生成，数据来源三路合并：
> 1. **bundle 静态提取** — 四个前端包中所有接口调用点（含未在 UI 触达的写接口）
> 2. **真实流量录制** — Playwright 登录后遍历 38 条路由的 3100+ 条请求
> 3. **只读探测** — 带着登录态对每个 GET 接口实发一次请求，记录状态码与响应结构
>
> 生成时间：${new Date().toISOString()}
>
> 接口总数 **${rows.length}**；其中真实流量验证 ${rows.filter((r) => r.verified === 'live').length} 条，
> 只读探测 2xx ${rows.filter((r) => r.probe && r.probe.status >= 200 && r.probe.status < 300).length} 条。

## 通用约定

| 项 | 值 |
|---|---|
| 应用前端 | \`https://xiumi.us\`（AngularJS SPA，哈希路由 \`#/\`） |
| 静态资源 CDN | \`https://edt.xiumius.cn\` |
| 读写接口前缀 | \`https://xiumi.us/api/...\` |
| 站点级接口 | \`https://xiumi.us/auth/...\`（登录、登出、当前用户） |
| 图片/静态资源 | \`https://statics.xiumi.us\`、\`https://img.xiumi.us\` |
| 作品展示页 | \`https://v.xiumi.us/board/v5/{发布者}/{作品ID}\` |
| 个人主页 | \`https://v.xiumius.cn/u/{user_sid}\` |
| 鉴权方式 | Cookie \`sid\`（HttpOnly / Secure / SameSite=None，有效期 3 天） |
| 统一响应体 | \`{"code":0,"message":"Common:OK","data":...}\`，\`code=0\` 为成功 |
| AJAX 约定 | 普通页面请求带 \`X-Requested-With: XMLHttpRequest\`；写接口用 \`Content-Type: application/json\` |

---

`;

for (const [mod, list] of [...byModule.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  md += `## 模块 \`${mod}\`\n\n${MODULES[mod] || MODULES.other}\n\n`;
  md += `| 方法 | 路径 | 验证 | 参数 |\n|---|---|---|---|\n`;
  for (const r of list.sort((a, b) => a.path.localeCompare(b.path))) {
    const m = r.methods.map((x) => x.method).join(' / ') || '?';
    const params = [...r.params, ...r.query.map((q) => q + '(query)')].slice(0, 14).join(', ') || '—';
    md += `| \`${m}\` | \`${r.path}\` | ${VERIFY_LABEL[r.verified]} | ${params} |\n`;
  }
  md += '\n';

  // 有实测样本的接口给详情
  const detailed = list.filter((r) => r.exampleResponse);
  if (detailed.length) {
    md += `<details>\n<summary>响应样本（${detailed.length} 条）</summary>\n\n`;
    for (const r of detailed.slice(0, 40)) {
      md += `**\`${r.methods[0]?.method || 'GET'} ${r.path}\`**\n\n\`\`\`json\n${JSON.stringify(r.exampleResponse, null, 2).slice(0, 1500)}\n\`\`\`\n\n`;
    }
    md += `</details>\n\n`;
  }
}

fs.writeFileSync(path.join(DOCS, 'API-REFERENCE.md'), md, 'utf8');

// ---------- docs/FIELDS.md ----------
let fmd = `# 字段字典

> 来源：真实流量中的响应样本 + 请求 query/body 反推。共 **${schemas.fields.length}** 条。
> 命名规则：\`RESP …\` 为响应字段，\`QUERY …\` 为 URL 查询参数，\`BODY …\` 为请求体字段。

## 响应字段（按接口）

`;
let curGroup = '';
for (const f of schemas.fields) {
  const g = f.field.split(' ').slice(0, 3).join(' ');
  if (g !== curGroup) { curGroup = g; fmd += `\n### \`${g}\`\n\n`; }
  const name = f.field.split(' → ').pop();
  const samples = (f.samples || []).slice(0, 3).map((s) => `\`${String(s).slice(0, 40)}\``).join(' ');
  fmd += `- \`${name}\` — ${f.type}${samples ? ` — 示例 ${samples}` : ''}\n`;
}
fs.writeFileSync(path.join(DOCS, 'FIELDS.md'), fmd, 'utf8');

console.log('合并完成');
console.log('  接口总数:', rows.length);
console.log('  实测:', rows.filter((r) => r.verified === 'live').length,
  ' 探测2xx:', rows.filter((r) => r.probe && r.probe.status >= 200 && r.probe.status < 300).length,
  ' 仅静态:', rows.filter((r) => r.verified === 'bundle').length);
console.log('  模块数:', byModule.size);
console.log('  字段:', schemas.fields.length);
console.log('输出: data/catalog.json  data/catalog.csv  docs/API-REFERENCE.md  docs/FIELDS.md');
