# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [语义化版本](https://semver.org/lang/zh-CN/)。

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

[1.0.0]: https://github.com/LING71671/xiumi-api/releases/tag/v1.0.0
