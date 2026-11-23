# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.3.0] - 2026-11-23

### 修复

- **`save()` 类型路由错了**（会把作品建成别的类型）。旧实现只看 `scene`，但
  paper/tablet 共用 `flw.vertical.one-page`、booklet/placard 共用 `fs.vertical.paging`，
  于是 `save(buildShow('tablet'))` 发到 `/api/shows/v5/paper`、
  `save(buildShow('placard'))` 发到 `/api/shows/v5/booklet`。现在新增
  `inferShowType()`，按 `scene + viewport.STAGE_SIZE + targetContext` 三条一起判，
  `save(show, id, { type })` 也可显式覆盖
- **会话过期不再静默返回 HTML**。`request()` 的 `redirect:'manual'` 会把 302 放行，
  旧实现再让 `JSON.parse` 失败回落成 text，于是掉登录态时调用方拿到的是登录页 HTML
  字符串。现在 302 跳 `/auth`、`code:-102/-101`、200 但 body 是 HTML 都抛
  `XiumiError`，并置 `err.expired = true`
- **`customDomainsForShow` 被同名方法静默覆盖**：文件里存在 path 参数式
  （`/api/custom_domains/for/show/{show_id}`，bundle 证据）与 query 式两个同名实现，
  后者覆盖前者。已删掉 query 式，并加单测禁止同名方法再次出现
- **`query` 里 `undefined` 会变成空串参数**（`?team_id=`），把「不筛选」变成「筛空值」。
  现在 `undefined` 直接跳过，`null` 仍发空值

### 新增

- **请求层**：`timeout`（默认 30s，`AbortSignal.timeout`）+ 幂等请求退避重试
  （`retry` 默认 2，只对 GET 与 429/5xx 生效 —— 写请求重放可能重复建作品）
- **`scripts/diff_endpoints.mjs`** —— 只信 bundle 字面量路径的接口比对工具：
  抓 `capture/assets` 里的 bundle，与客户端已封装路径做段级比对，输出
  `capture/diff_new.json` / `capture/diff_dead.json`，并单列「已确认覆盖、
  只是路径形状对不上」的假阳性。比 `extract_endpoints.mjs` 更保守但不会张冠李戴
  （后者会把 `/api/teams/{id}/members` 误记成 `/api/shows/members`）
- **`scripts/fetch_assets_static.mjs`** —— 纯 HTTP 抓前端 bundle，补接口时不必为
  Playwright/Chromium 付代价
- **49 个新方法**（全部 `[未实测]`，目录 399 → 443）：
  - 团队协作：`addTeamMember` `removeTeamMember` `setTeamMemberRole`
    `setTeamMemberInfo` `setEnterpriseMember` `memberShareAuth` `shareMemberAuth`
    `recycleMemberShareAuth` `setMemberVisibility` `quitTeam` `transferTeamOwner`
    `teamIdentity` `submitTeamIdentity` `teamRenameApplication`
    `submitTeamRenameApplication` `enterpriseMemberRemoveCount`
    `teamTrafficPackageInfo` `teamSaveToRecords` `createSubAccount`
    `deleteSubAccount` `resetSubAccount` `teamShowsCountFor` `teamDeletedShows`
  - 表单导出：`exportFormData` `formExportProgress` `deleteFormRows`
  - 第三方授权：`oauthAuthorizations` `revokeAuthorization` `revokeAllAuthorizations`
  - 登录密钥：`loginKey`（`secureSubmit` 的 RSA 公钥前置）
  - 其他：`frozenCheck` `moveExhibit` `updateDomainById` `removeDomainById`
    `createDomainHttps` `setRightFormClosed` `myGoodsTypeSummary`
    `goodsPriceChangeDays` `goodsTags` `goodsModifyApplication`
    `markApplicationModified` `revokeApplicationById` `partnerAppApplicationInfo`
    `ownerPartnerAppInfo` `setPartnerImageCache` `deletePartnerAppById`
    `resetPartnerAppSecretById` `unbindPartnerAppById` `unbindOwnerPartnerAppById`
- **`test/client.test.mjs`** —— 17 个离线单测（`npm test`，零依赖，不联网）：
  成功码/错误码/302/HTML/`-102` 的语义、重试只对 GET、超时、`save()` 四种类型路由、
  包体签名形状、lz-string 往返、目录口径、同名方法禁止
- **`.github/workflows/ci.yml`** —— 覆盖原来的 `secret-scan.yml`：新增 Node 20 跑单测 +
  `coverage.mjs` 校验台账一致性

### 变更

- **方法目录口径收紧**：剔除 `get`/`post`/`put`/`del` 四个访问器别名（`request()` 的语法糖，
  不是接口方法）与 `_me`。以前它们混在「399 个方法」里，还顶着「❔ 无记录」占位
- **`coverage.mjs` 增加反向校验**：`verification.json` 里存着源码已不存在的方法时点名
  并以非 0 退出（`--prune` 清理）。此前有一条幽灵记录 `recoverableShows`
  （对应方法早已不存在，`PARITY.md` 却还写着 ✅），导致「台账 4 条失败、报告只显示 3 条」
- `docs/PARITY.md`：修正三处不存在的方法引用（`recoverableShows`、`setMuteLegacy`、
  `bindWechat`），总账改为 443 / 57 模块

## [1.2.0] - 2026-09-21

### 新增

- `scripts/lib/verification.mjs` — **验证状态的唯一权威存储** `data/verification.json`。
  状态只由验证脚本回写，合并语义（分批跑不丢其它条目）。`firstVerifiedAt` / `runs[]`
  保留证据链，`blocked` 与 `failed` 分开记
- `scripts/lib/methodmeta.mjs` — 方法元数据（签名 / 注释 / 读还是写）从 `cli.mjs` 抽出来，
  `cli.mjs`、`coverage.mjs` 共用一份，避免两处各解析一次源码
- `scripts/verify_ops.mjs` — 可逆写面 + 只读面的端到端验证。只读批次断言
  「路由 + 鉴权 + 参数形状都通、拿到了值」并把返回形状写进备注；写批次一律
  「建自己的 → 改 → 回读 → 删/还原」，做不到可逆的记 ⛔ 并写清原因
- `scripts/coverage.mjs` + `docs/COVERAGE.md` + `data/coverage.json` —
  从 `verification.json` 渲染逐方法台账（方法 / 类型 / 状态 / 风险 / 证据脚本·用例·时间 / 说明）
- 新的状态档 🟡「调用被接受」：写请求返回成功但该账号读不出可观测差异
  （如只影响外观的偏好键）单列一档，既不混进 ✅ 注水，也不冤枉成 ❌
- `package.json`：`npm run verify` / `verify-ops` / `coverage` / `verify-all`

### 变更

- **验证状态不再看源码注释**。`docs/CAPABILITIES.md` 增加「验证状态」列，
  只读 `data/verification.json`；客户端 JSDoc 里的 `[未实测]` 降级为「声明」，
  在语义上与研究结论分离
- `docs/VERIFIED.md` 从「42 项报告」改成「验证纪律 + 关键机制说明」，数字交给 `COVERAGE.md`
- `docs/PARITY.md` 的总账改为引用 `data/coverage.json`，并标注来源与生成方式

### 修复（都是这轮实测才发现客户端写错了的）

- `addImageTag(asset_id, tag)` — 原来写成 `POST /api/assets/type/image/tags`，实测 404。
  真实是**素材级**：`POST /api/assets/{asset_id}/tags`（bundle 证据 + 实测 `"Added"`）
- `deleteImageTag(tag, {team_id})` — 原来漏了路径段，`DELETE /api/assets/type/image/tag`
  实测 404。正确是 `DELETE /api/assets/type/image/tag/{tag}`
- 新增 `getImageTags(asset_id)`、`removeImageTag(asset_id, tag)`。
  后者按 bundle 直译的 `DELETE .../tags/{tag}` 实测 404，
  真实可用的是 `DELETE /api/assets/{asset_id}/tags`、`tag` 放 body
- `setShowReceiveType(value)` — 原按路径段写，实测 404。
  bundle 证据是 `POST /api/user_setting/show-receive-type {showReceiveType}`
- `setTagsOrder` / `setImageTagsOrder` / `setFragmentTagsOrder` —
  `order` 必须是**字符串**，传数组服务端报
  `Common:Failed: "arguments[2]" must be of type "string | Buffer"`。新增 `asOrder()` 收口
- `verifyHtmlCode(html)` — 原样透传 `body` 会把字符串当请求体，实测 400。改为 `{html}`
- `renameShow(show_id, title)` — `PUT /api/shows/{id}` 只给 `{title}` 会被
  `Common:Failed_DataRejected` 拒掉。改成「读草稿 → 改 title → 整包 PUT」
- `forms(show_id, …)` — 表单数据必须带作品 id（`/api/forms/{show_id}/`），无参 404
- `statisticsShow(show_id)` / `showStatistics(show_id, kind)` —
  真实入口是 `/api/statistics/show/{id}/daily|ranks`
- `myGoodsInfo(show_goods_id)` / `invitation(salt_code)` — id 都在路径段上，不是无参
- `customDomains({team_id})` — 不带 team_id 会 `Failed_InvalidParam`
- **删除三个幻影方法**：`setMuteLegacy`（旧路径实测 404，bundle 里只有 `setting/` 那一套）、
  `recoverableShows`（`GET /api/shows/recover` 不存在，回收站列表走 `deletedShows`）、
  `formData`（`GET /api/forms/data/forshow/{id}` 在 paper 型作品上 404）
  —— 方法总数 402 → 399
- `homeTags` / `homeTagOrderMap` / `publishedUser*` 的 `uid` 参数注明必须是
  **`unique_uid`**：传 `user_sid` 会 `Common:Failed_NotFound: unique_uid`

### 说明

- 本轮验证在真实账号上跑，一次性作品/素材建后即删（作品进回收站，平台没有「清空回收站」接口）。
  账号设置里首次写过两个语义为 null 的键（`studio.appearance.desk.background`、
  `studio.asset.images.watermark`），与「未设置」视觉等价。
- 仍有 3 项实测不通过、21 项环境受限，逐条列在 `docs/COVERAGE.md`。

## [1.1.1] - 2026-09-21

### 变更

- 对外表述统一为「非官方 API 与客户端 / 接口梳理」，不再使用「逆向」措辞：
  `README.md` 首段、`docs/PARITY.md`、`docs/SITE-TOPOLOGY.md`、仓库描述与话题标签、
  `package.json` 关键词（`reverse-engineering` → `api-documentation`）
- 端到端验证脚本的样例作品标题改为 `API 客户端验证样例`，两处需同步：
  `scripts/editor_create.mjs`（写入方）与 `scripts/probes/probe_textedit.mjs`（假设此为旧文本的断言方）

## [1.1.0] - 2026-09-21

### 新增

- `scripts/cli.mjs` — 全站操作 CLI，把客户端 **399 个方法**原样暴露成命令行：
  `list` / `describe` / `call` / `raw` / `login` / `me`。不设白名单、不二次确认，
  只标注 `读` `写` 与 `删除/清空` `资金` `账号凭据` `修改`（源码静态推断 + 命名启发式）
- `docs/CAPABILITIES.md` — 399 个方法的可读目录（`npm run capabilities` 重新生成）
- `login` 支持三种方式：账密（纯 HTTP）、`--browser`（playwright 拉有头浏览器，
  手动扫码/短信/账密登录后自动抓 `sid`）、`--sid`（直接给值，`-` 表示从 stdin 读）
- `package.json` 增加 `bin: { xiumi }`

### 修复

- 方法目录以**运行时自省**为准（`Object.getOwnPropertyNames`），静态解析只补签名与注释。
  原先纯静态解析会漏掉 5 个方法：`get` / `post` / `put` / `del` 四个访问器，以及
  `comments`（签名里嵌了 `Date.now()`，`[^)]*` 正则在它的右括号处断掉）
- 写操作判定修正两处假阳性：下一个方法的 JSDoc 落进上一个方法体（尾文档未裁剪）、
  注释里举例的 `this.request('POST', ...)` 被当成真实调用
- JSDoc 提取改用最靠后的 `/**`，原先会从更早的注释一路吞到签名前，导致说明错位
- `--sid` / `--browser` 登录不再把会话文件里原有的账密写成 `null`

## [1.0.0] - 2026-09-20

首次开源发布。

### 客户端

- 零依赖 API 客户端（Node 18+ 内置 `fetch` / `crypto`），397 个方法覆盖 58 个模块
- 会话管理：账号密码登录、会话落盘与复用、sid 有效期自动续期
- 作品数据编解码：自实现 LZ-String，兼容站内 `format` / `encodedData` / `signature` 协议
- 写操作自动处理乐观锁（`Failed_ShowSavedTimeNotMatch` 时重取 `lastSavedAt` 重试）
- 图片上传（`uploadImageBase64`）、模板库取用（`templateItems` / `templateComp`）

### 文档

- `docs/API-REFERENCE.md` — 308 个接口清单，按模块分组并标注验证状态
- `docs/FIELDS.md` — 649 个字段字典
- `docs/VERIFIED.md` — 写操作验证报告与关键机制说明
- `docs/AI-CREATION.md` — AI 内容创作能力清单
- `docs/RECIPES.md` — 内容创作实操配方
- `docs/SITE-TOPOLOGY.md` — 域名拓扑实测：`xiumius.cn` 与 `xiumi.us` 的分工

### 数据

- `data/catalog.json` / `endpoints.json` / `live_endpoints.json` / `schemas.json` /
  `probe_results.json` / `verified.json` — 结构化接口目录与字段样本

### 工具

- `scripts/misc/secret_scan.py` — 开源前与提交前的敏感信息扫描
- `scripts/misc/desensitize.py` — 确定性脱敏（映射表本地化，脚本本身不含真实值）

### 说明

- 仓库内所有结构性数据均已脱敏：账号标识、他人资源标识、本机绝对路径
- `capture/`、`logs/`、`exports/` 属本地运行数据，不入库

[1.1.0]: https://github.com/LING71671/xiumi-api/releases/tag/v1.1.0
[1.0.0]: https://github.com/LING71671/xiumi-api/releases/tag/v1.0.0
