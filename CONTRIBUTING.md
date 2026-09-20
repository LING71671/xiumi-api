# 贡献指南

## 提交前必做

```bash
python scripts/misc/secret_scan.py
```

必须零 `BLOCK` 项。它会拦住凭据、手机号、私钥、本机绝对路径。

## 代码约定

- 客户端保持**零依赖** —— 只用 Node 内置模块（`fetch` / `crypto` / `fs`）。新增第三方依赖需先讨论
- 脚本里的路径一律从 `scripts/cfg.mjs` 派生（`ROOT` / `CAPTURE_DIR` / `SESSION_FILE`），
  不写绝对路径
- 新增接口请同时更新 `client/xiumi.mjs` 与 `data/`，必要时跑 `node scripts/gen_docs.mjs` 重生成文档

## 新增接口的流程

1. 在真实流量或 bundle 里确认**方法与路径**，不要凭直觉推断
2. 用 `scripts/verify_matrix.mjs` 做零副作用验证（畸形 body + 不存在的 ID + 写成当前值）
3. 在 `docs/VERIFIED.md` 记录：请求、响应、判据、结论
4. 只读接口可直接标 `live`；写接口必须验证可逆或零副作用

## 不要提交

- `scripts/account.local.json`、`capture/*`、`logs/`、`exports/`
- 任何真实账号的手机号、`unique_uid`、密码、`sid`
- 带本机绝对路径的临时脚本

## 许可

贡献即表示同意以 Apache-2.0 授权。
