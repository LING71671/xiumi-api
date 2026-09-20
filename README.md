# xiumi-api — 秀米（xiumi.us）非官方全站 API 与客户端

对秀米 web 应用的完整逆向产物：**308 个接口 · 649 个字段 · 42 项写操作端到端实测通过**。
拿一份 `sid` 登录态（或直接给账号密码），即可对账号做任何操作：读写作品、编辑内容、
上传素材、打标签、拷贝/删除/恢复、管理账号与订单。

**零运行时依赖**：客户端只用 Node 18+ 内置 `fetch` + `crypto`。
Playwright 只在"抓包 / 渲染验证"阶段需要，属可选依赖。

> API 只有一套，全在 `xiumi.us`。`xiumius.cn` 是纯静态着陆页（腾讯 COS 桶），
> 一行接口都没有 —— 实测证据见 [`docs/SITE-TOPOLOGY.md`](docs/SITE-TOPOLOGY.md)。

---

## 目录

```
xiumi-api/
├── README.md                  ← 本文件
├── client/
│   ├── xiumi.mjs              ← 客户端 SDK（零依赖，import 即用）
│   └── lz-string.mjs          ← 自实现 LZ-String（作品数据编解码）
├── docs/
│   ├── API-REFERENCE.md       ← 308 个接口全量清单（按模块分组，含验证状态）
│   ├── FIELDS.md              ← 649 个字段字典
│   ├── AI-CREATION.md         ← AI 内容创作能力清单（能做什么 / 还差什么）
│   ├── RECIPES.md             ← 内容创作实操配方（新建/改文本/插图/拷贝/删除）
│   ├── VERIFIED.md            ← 42 项写操作验证报告 + 关键机制说明
│   └── SITE-TOPOLOGY.md       ← xiumius.cn 与 xiumi.us 的域名分工（API 只有一套）
├── scripts/
│   ├── cfg.mjs                ← 路径与浏览器解析的唯一来源
│   ├── misc/                  ← 脱敏与密钥扫描工具（见「提交前检查」）
│   ├── probes/                ← 一次性探针，保留作方法参考
│   └── *.mjs                  ← 抓包、提取、验证、文档生成
├── data/                      ← 结构化产物（endpoints / catalog / schemas / verified）
│                                 全部经过保形伪名化，见「数据脱敏」
├── capture/                   ← 原始抓包（本地，不提交）
└── logs/                      ← 运行日志（本地，不提交）
```

---

## 快速开始

```js
import { Xiumi } from './client/xiumi.mjs';

// 一、账号密码登录（无需浏览器，无需验证码——除非触发风控）
const api = await Xiumi.login({ user: '手机号', password: '密码' });
await api.saveSession('./session.json');       // sid 有效期 3 天，落盘复用

// 二、复用登录态
const api2 = await Xiumi.loadSession('./session.json');

// 三、读
console.log(await api2.me());                              // 当前用户
console.log(await api2.sysInfo());                         // 站点配置
console.log(await api2.listShows({ type: 'paper', limit: 10 }));
console.log(await api2.getShow(727015965));                // 作品元信息
console.log(await api2.readShowData(727015965));           // 作品内容 JSON

// 四、写
const s = await api2.createBlankShow('paper', '我的新图文');
const meta = await api2.getShow(s.show_id);
const { data } = await api2.readShowData(meta);
data.title = '改过的标题';
await api2.updateShow(meta, data);                         // 乐观锁失败会自动重试
await api2.addTag(s.show_id, '测试标签');
await api2.deleteShow(s.show_id);

// 五、从零创作（不克隆任何已有作品）—— 详见 docs/AI-CREATION.md
const up = await api2.uploadImageBase64(pngBuffer, 'cover.png');
const t1 = await api2.templateComp('paper-cp:header/1-txt-normal', (c) => { c.txt1.text = '<p>标题</p>'; });
const im = await api2.templateComp('paper-cp:image/001-img-center', (c) => { c.img1.src = up.target_uri; });
const show = api2.buildShow('paper', 'AI 生成的图文');
show.cubes[0].pages[0].layers[0].comps.items.push(t1, im);
api2.appendPage(show, { texts: ['<p>第二页</p>'] });
const created = await api2.createShow('paper', show);
console.log('编辑器:', 'https://xiumi.us' + created.edit_url);
```

> ⚠️ **组件结构只能从站内模板库取**（`GET /api/templates/items` 的 `matrix`）。
> 手写不存在的 `tplId` 不会报错，只会让编辑器静默渲染成占位图。

---

## 鉴权机制

| 项 | 值 |
|---|---|
| 会话凭证 | Cookie `sid`（HttpOnly / Secure / SameSite=None） |
| 有效期 | 3 天；**多活**，非单活（多设备并行不互踢） |
| 登录接口 | `POST /auth/email/login`，`application/x-www-form-urlencoded`，字段 `area_code` / `email` / `password` |
| 登录成功 | `302` + `Set-Cookie: sid=...`，**不是** 200 JSON |
| 风控预检 | `GET /api/auth/login-captcha?area_code=86&username=<手机号>` → `true` 表示本次需要腾讯防水墙 TCaptcha（appid `2046835682`） |
| 当前用户 | `GET /auth/me` → `{user, requirePhoneBind}` |
| 登出 | `GET /auth/logout` ⚠️ **GET 也能登出自己，探测时务必拉黑** |

> 登录成功后判据是 `data.user` 存在。字段层级是 `resp.data.user`，不是 `resp.user`。

---

## 统一约定

**响应体**（除个别接口）：

```json
{ "code": 0, "message": "Common:OK", "data": { } }
```

| code | message | 含义 |
|---|---|---|
| 0 | `Common:OK` | 成功 |
| 1 | `Common:Created` | 已创建 |
| 2 | `Common:Updated` | 已更新 |
| 3 | `Common:Deleted` | 已删除 |

**四个成功码都算成功。** 只认 0 是错的——`PUT` 返回 2、`DELETE` 返回 3。

**重要例外**：`editing_show_data_url`（`/api/shows/{id}/data/editing`）与 CDN 上的
`show_data_url` 返回**裸 JSON**，不套 envelope。用 `api.fetchJson(url)` 读，它会自动判断。

**请求头**：普通接口带 `X-Requested-With: XMLHttpRequest`；写接口用
`Content-Type: application/json` + `Origin`/`Referer: https://xiumi.us`。

---

## 作品数据包（内容创作的核心）

编辑器保存作品时，不是把 JSON 直接发上去，而是：

```
1. 取 n = Date.now().toString()
2. 取 r = Math.round(1e6 * Math.random()).toString()
3. i = md5([r, unique_uid, n].join('$$'))
   signature = md5([n, unique_uid, r].join('$$'))
4. 在数据里塞三个附录字段：
     desc_appendix_1 = n[0..8] + i[8..]
     desc_appendix_2 = i[0..8] + n[8..]
     desc_appendix_3 = r
5. encodedData = LZString.compressToBase64(JSON.stringify(data))
6. POST /api/shows/v5/{type}
   body = { format: 'c444c492de13eb854a687b3361bef8c4', encodedData, signature }
```

这套逻辑已实现在 `client/xiumi.mjs` 的 `wrapShowData()` / `unwrapShowData()`，
调 `createShow` / `updateShow` 时自动走。

作品数据对象的顶层结构（实测样本）：

```
version  title  desc  cover  backgroundMusic
displaySystemTitle  displaySystemPageMargins  displaySystemCatalogue
scene  viewport  targetContext
cubes[]  actingType  popups  autoSlideInterval
authorAppendix  wx_author  wx_link  $appendix
```

- `viewport` = `{ STAGE_SIZE: 'flow_scroll', WIDTH: 415, FONT_SIZE: 16 }`
- `cubes[0]` = `{ _comp, pages[], grounds[], overlaps[] }`
- `pages[i]` = `{ _comp, layers[] }`
- `layers[j]` = `{ _comp: { tplId, constraint, pose, style, _$uuid, _$raHTML }, comps[] }`

> 每个组件都带 `_$raHTML`（渲染加速用的 HTML 字符串）。**不要手写新组件**——
> 从已有作品里克隆页面/图层再改文本，是唯一稳的创作路径。见 `docs/RECIPES.md`。

---

## 接口地图（按功能）

完整清单见 `docs/API-REFERENCE.md`（308 条）。以下是高频入口：

### 账号
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/auth/me` | 当前用户 |
| GET | `/api/user/info?include=` | 用户详情（可指定字段） |
| GET/PUT | `/api/user/info/nickname` | 昵称 |
| POST | `/api/user/info/avatar` | 头像 |
| PUT | `/api/user/password` | 改密码 |
| GET | `/api/apikey` | 开放 API 密钥 |
| GET | `/api/sys_info` | 站点配置 |

### 作品
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/shows?show_type&limit&offset&search&sort_by` | 我的作品 |
| GET | `/api/shows/from/official2` | 官方原型 |
| GET | `/api/shows/from/teams/{teamId}` | 团队作品 |
| GET | `/api/shows/count` | 数量 |
| **GET** | **`/api/shows/{id}?include=`** | **元信息** |
| GET | `/api/shows/{id}/histories` | 历史版本 |
| GET | `/api/shows/deleted/shows` | 回收站 |
| **POST** | **`/api/shows/v5/{type}`** | **新建作品** |
| **PUT** | **`/api/shows/{id}`** | **保存作品（带乐观锁）** |
| POST | `/api/shows/v5/{type}?from_show_id=` | 拷贝作品 |
| POST | `/api/shows/send` | 发给他人/团队 |
| PUT | `/api/shows/{id}/right_access_privilege/{v}` | 权限位 |
| PUT | `/api/shows/{id}/wechat_no_share/{v}` | 微信分享屏蔽 |
| PUT | `/api/shows/{id}/use_traffic_package/{v}` | 流量包开关 |
| POST | `/api/shows/{id}/release/application` | 申请发布 |
| **DELETE** | **`/api/shows/{id}`** | **删除（进回收站）** |
| **POST** | **`/api/shows/recover/{deleted_show_id}`** | **恢复** |
| GET | `/preview/uri?to=&preview_for=` | 预览链接 |

`type` 取值：`paper`（图文）| `tablet`（长图）| `booklet`（册子）| `placard`（海报）| `manuscript`（文稿）

### 标签
| 方法 | 路径 |
|---|---|
| GET | `/api/shows/{type\|all}/tags?team_id` |
| POST | `/api/shows/{id}/tags`（body `{tag}`，值需 `encodeURIComponent`） |
| DELETE | `/api/shows/{id}/tags/{encodedTag}` |
| POST | `/api/shows/tags/rename` |
| DELETE | `/api/shows/tags/clear/{encodedTag}` |
| GET | `/api/shows/by/tags/{encodedTag}` |
| GET | `/api/shows/by/untag` |
| GET/POST | `/api/shows/tags/order` |

另有平行的一套 `pattfrag-tags`（模板碎片标签），路径同样式。

### 素材库
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/assets/list/image?limit&offset` | 图片列表 |
| POST | **`/api/assets/image/data`** | base64 直传（`{base64, filename, team_id}`） |
| POST | `/api/assets/image/outlink` | 收外链图进库 |
| POST | `/api/assets/image/imagedata` | 上传原始 image_data |
| POST | `/api/upload-cdn/token` | 取 COS 直传凭证（大文件） |
| POST | `/api/assets/image/cosobj` | 登记 COS 对象 |
| DELETE | `/api/assets/{asset_id}` | 删除素材 |
| POST | `/api/assets/clearimages` | 清空 |

### 收藏碎片
`category` 取 `comp`（纸媒组件）或 `page`（册子页面）。

| 方法 | 路径 |
|---|---|
| GET | `/api/fragments/v5/{type}/{category}/untags?limit&offset&order` |
| GET | `/api/fragments/v5/{type}/{category}/tags/{encodedTag}` |
| GET | `/api/fragments/v5/{type}/{category}/tags` |
| GET | `/api/fragments/v5/{type}/{category}/tagsorder` |
| POST | `/api/fragments/v5/{type}/{category}/tagsorder` |
| GET | `/api/fragments/used/{paper_cp\|booklet_pg}` |
| POST | `/api/fragments/up/{fragment_id}` |

### 模板 / 表单 / 团队 / 订单 / 导出
见 `docs/API-REFERENCE.md` 与 `client/xiumi.mjs` 的 `listTemplates` / `formData` /
`teams` / `orders` / `renderPdf` 等方法。

### 从零创作（AI 创作主路径）
| 方法 | 说明 |
|---|---|
| `buildShow(type, title)` | 用站内空模板造一份骨架（`showDataGenerator` 的等价物） |
| `appendPage(showData, {texts, imageSrc})` | 追页面，自动配背景层 |
| `templateComp(atom_tpl_id, mutate)` | **从官方组件库取组件**（21640 条），别手写 tplId |
| `listTemplates({q, tagCategory, limit, page})` | 检索组件/模板 |
| `templateItems(atom_tpl_id[])` | 批量取 `matrix` + `renderer_accelerate` |
| `templateTagsTree()` | 组件标签树 |
| `uploadImageBase64(buf, name)` | 上传图片，返回 `target_uri` |
| `save(showData, show_id?)` | 有 id 走 PUT，无则 POST 新建 |

模块级导出：`emptyShow` / `emptyPage` / `emptyLayer` / `emptyCube` / `emptyGround` /
`textComp` / `imageComp` / `cloneComp` / `newCompUuid`。

---

## 客户端方法速查

```js
// 会话
Xiumi.login({user, password})   loadSession(file)   saveSession(file)
signIn()  signOut()  needCaptcha(user)

// 账号
me()  userInfo(include)  sysInfo()  apiKey()  loginHistory()
setNickname(v)  setAvatar(url)  changePassword({old_password,new_password})
walletBalance()  bills({limit,page})  trafficPackages()  templateMembership()
contacts()  addContact(payload)  blacklist()

// 作品
listShows({type,limit,offset,search,version,sortBy,source,teamId})
showsCount()  teamShows(teamId)  officialShows()  deletedShows()
getShow(id, include)  getShowFull(id)  readShowData(id|url,{editing})
createShow(type, data, {fromShowId,toUser})   createBlankShow(type,title)
updateShow(idOrMeta, data)                    copyShow(show, toUser)
sendShow(show_id, {toSelfAccount,toUserAccount,toTeamAccount})
showHistories(id)  showPaymentList(id)  showStatistics(id)
trafficPackageUsage(id)  validateTeamShow(id)  customDomainsForShow(id)
previewUri(to, previewFor)
setRightAccessPrivilege(id,v)  setWechatNoShare(id,v)  setTrafficPackageUsage(id,v)
submitReleaseApplication(id)
renameShow(id,title)  deleteShow(id)  recoverShow(deleted_show_id)  restoreShow(id)
wxArticleData(articleurl)  importWxArticle(articleurl)

// 标签（标签 / 模板碎片标签两套）
listTags(type)  tagsOrder()  setTagsOrder(order)  addTag(id,tag)  removeTag(id,tag)
renameTag(old,new)  clearTag(tag)  showsInTag(tag)  showsUntag()
listPattFragTags()  addPattFragTag(id,tag)  removePattFragTag(id,tag) ...

// 素材
listImages()  imagesCount()  usedImagesCount()  listVideos()  listAudios()
imageTags()  deleteAsset(id)  clearImages()
uploadImageBase64(buf, filename)  addImageOutlink(url, {teamId})
uploadCdnToken({upload_type})  registerCosObject({object_name})

// 碎片
listFragments({type,category,limit,offset,order})  listFragmentsByTag(tag)
fragmentTagDetails()  fragmentTagsOrder()  setFragmentTagsOrder()
usedFragmentsCount('paper_cp')  upFragment(id)

// 模板 / 表单 / 团队 / 订单 / 导出
listTemplates({q})  templateItems(ids)  templateTagsTree()  templateComp(id, mutate)
buildShow(type,title)  appendPage(show,{texts,imageSrc})  save(show,show_id)
formData(show_id)  formCount(show_id)  forms()
teams()  team(id)  orders()  invoices()  messages()  messagesStatus()
renderScreenshot(id)  renderPdf(id)  renderGif(id)  renderVideo(id)  renderFrames(id)

// 底层逃生口
request(method, path, {query, body, form, raw})   fetchJson(url)
unwrapShowData(encodedData)  wrapShowData(show, uniqueUid)
```

---

## 脚本

| 脚本 | 用途 | 需要 Playwright |
|---|---|---|
| `scripts/smoke.mjs` | 浏览器冒烟 | 是 |
| `scripts/login.mjs` | 浏览器登录并落盘 storage_state | 是 |
| `scripts/fetch_assets.mjs` | 递归抓取全站 JS/HTML/CSS | 是 |
| `scripts/explore.mjs` | 登录态遍历 38 条路由录制 XHR | 是 |
| `scripts/extract_endpoints.mjs` | 从 bundle 静态提取接口 | 否 |
| `scripts/analyze_capture.mjs` | 解析流量 → 实测接口 + 字段字典 | 否 |
| `scripts/api_probe.mjs` | 只读 GET 探测（带危险端点黑名单） | 否 |
| `scripts/gen_docs.mjs` | 三路合并生成 `docs/API-REFERENCE.md`、`docs/FIELDS.md` | 否 |
| **`scripts/verify_matrix.mjs`** | **42 项可逆写验证** | 否 |
| `scripts/e2e_roundtrip.mjs` | 单作品读写往返 | 否 |
| `scripts/misc/secret_scan.py` | **提交前密钥/个人信息扫描** | 否 |
| `scripts/misc/desensitize.py` | **保形伪名化（幂等）** | 否 |

`scripts/probes/` 下是一次性探针，保留作方法参考：从零构造作品
（`probe_create_scratch.mjs`）、官方组件库构造（`probe_official_comp.mjs`）、
改正文文本 + 渲染确认（`probe_textedit.mjs`）、删除/回收站语义
（`probe_trash.mjs`）、恢复用哪个 id（`probe_recover.mjs`）等。

```bash
node scripts/gen_docs.mjs          # 重新生成文档
node scripts/verify_matrix.mjs     # 跑写验证（会自建自删一次性作品）
```

---

## 环境备注

- 客户端零依赖；抓包与渲染类脚本需要 `playwright-core` + 本机 Chromium（可选依赖）。
- `scripts/cfg.mjs` 的 `resolveChromium()` 会按
  `PLAYWRIGHT_BROWSERS_PATH` → `%LOCALAPPDATA%/ms-playwright` → `~/.cache/ms-playwright`
  的顺序找可执行文件，避免 ms-playwright 缓存与 `playwright-core` 期望的 revision 不一致导致的
  `Executable doesn't exist`。也可直接用 `XIUMI_CHROME` 指定。
- 需要走代理时设 `XIUMI_PROXY=http://127.0.0.1:<port>`，默认不启用。
- 应用与 API 只有一个宿主（`xiumi.us`）。`xiumius.cn` 是纯静态着陆页，没有 API —— 见
  `docs/SITE-TOPOLOGY.md`。

---

## 数据脱敏与提交前检查

`data/` 与 `docs/` 里不含任何真实账号信息。原始抓包 `capture/` 只留在本地，
入库前统一经过**保形伪名化**：长度与字符集保持不变，同一原值恒定映射到同一伪名 ——
JSON 结构、字段形状、数据内部的关联关系全部保留，仍可直接做字段与接口分析。

替换对象：账号 `unique_uid`、`user_sid`、作品与个人主页标识、昵称、地区、标题、
CDN 资源 hash（头像、素材图、平台模板图）、手机号、密码、本机绝对路径。

协议常量**不在替换范围内** —— 例如 `format` 的取值换了客户端就跑不通。
工具里以 `protected` 白名单硬性拦截，映射表一旦试图替换它就直接报错退出。

```bash
python scripts/misc/desensitize.py            # 预览，不写盘
python scripts/misc/desensitize.py --apply    # 写入（幂等，重复运行不会打乱已有结果）
python scripts/misc/secret_scan.py            # 扫描，退出码非 0 即存在 BLOCK 项
```

`secret_scan.py` 分两级：`BLOCK`（凭据、手机号、私钥）必须处理干净；
`WARN`（本机路径、疑似标识）需人工确认。CI 跑的是同一份扫描器。

含真实值的两个文件只存在于本地，且已被 `.gitignore` 排除：
`scripts/desensitize.map.local.json`（原值→占位值映射）、
`scripts/desensitize.state.local.json`（已产出伪名，用于保证重复运行幂等）。
**这两个文件绝不能提交。**

---

## 相关项目

- [**autoxiumi**](https://github.com/LING71671/autoxiumi) —— 基于本客户端的内容创作自动化 skill：
  Markdown / JSON → 图文作品，含组件取用、分页、图片上传与渲染验证。

---

## 许可

[Apache-2.0](LICENSE)

## 免责

本仓库是对公开 Web 应用的前端接口分析，仅用于学习与自有账号的自动化。
使用他人账号或用于绕过站点服务条款的行为与本项目无关。
使用前请确认符合服务条款与所在地法律法规。
