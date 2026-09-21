# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [语义化版本](https://semver.org/lang/zh-CN/)。

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
