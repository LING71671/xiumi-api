# 域名拓扑：`xiumius.cn` 与 `xiumi.us` 是什么关系

结论先说：**不是「两个站」，是「一套应用 + 域名分工」。API 只有一套，全在 `xiumi.us`。**
做接口逆向只需要盯着 `xiumi.us`，`xiumius.cn` 一行接口都没有。

## 一张图

```
用户看到的入口
  xiumius.cn          中文品牌着陆页（纯静态，COS 桶）
       │
       │ 页面里每一个功能链接都指向 xiumi.us
       ▼
  xiumi.us            ★ 唯一应用 + 唯一 API 宿主
       │              所有 /api/*  /auth/*  /studio/*  登录态都在这
       │
       ├── edt.xiumius.cn     编辑器 / 主页 bundle 的 CDN（nginx）
       ├── img.xiumi.us       图片桶（腾讯 COS）
       ├── statics.xiumi.us   静态资源桶（腾讯 COS）
       ├── v.xiumi.us         作品公开页
       └── wx.xiumi.us        微信端服务（独立 Node 服务）
```

## 逐个域名的角色

| 域名 | 服务器 | 角色 | 实测证据 |
|---|---|---|---|
| `xiumi.us` | nginx | **应用 + 全部 API** | `/api/sys_info` → 200 JSON envelope；`/auth/me` → 401 `Auth:Failed_NotLogin` |
| `xiumius.cn` | **tencent-cos** | 中文着陆页 + 前端资源 | `/api/*` → 404 `Code: NoSuchKey`（COS 报错）；`/scripts/app/home/*.js` → 200 |
| `edt.xiumius.cn` | nginx | 编辑器/主页 bundle CDN | us 站首页 8 个请求打到这里；`/studio.html` → 404 |
| `v.xiumius.cn` | nginx | 作品公开页（根路径 302 到 xiumi.us） | `/` → 302 `http://xiumi.us` |
| `v.xiumi.us` | — | 作品公开页（cn 首页里的真实链接形态） | 首页 href `//v.xiumi.us/board/v5/...` |
| `wx.xiumius.cn` | nginx | 微信端服务 | `/` → 404 `{"errcode":404,"errmsg":"Cannot GET /"}` |
| `img.xiumi.us` / `statics.xiumi.us` | tencent-cos | 图片 / 静态资源桶 | `/` → 403 `AccessDenied` |
| `xiumi.cn` / `xiumius.com` | — | **不存在** | DNS 解析失败 |

## 四条硬证据

### 1. cn 域名下没有 API（COS 桶的报错形态）

```
GET https://xiumius.cn/api/sys_info
 → 404  content-type: text/html
   <h1>404 Not Found</h1><ul><li>Code: NoSuchKey</li>
GET https://xiumi.us/api/sys_info
 → 200  application/json
   {"code":0,"message":"Common:OK","data":{"node_env":"production","version":"14.4.2",...}}
```

`NoSuchKey` 是对象存储找不到对象的错误，说明这个域名后面是 COS 桶，不是应用。

### 2. cn 首页里所有功能出口都是 us 域名

抓下 `https://xiumius.cn/` 的 HTML，34 个 href 里的功能链接：

```
https://xiumi.us/auth                                 ← 登录
https://xiumi.us/auth?callback_url=...                 ← 带回调的登录
https://xiumi.us/studio/v5/paper                       ← 图文编辑器
https://xiumi.us/#/studio/papers                       ← 我的图文
https://xiumi.us/#/studio/shop/paper                   ← 模板商城
https://xiumi.us/#/studio/shop/tablet                  ← 长图商城
//v.xiumi.us/board/v5/2a5va/6159244                    ← 作品公开页
mailto:support@xiumi.us
```

站内配置也全指 us：

```js
injectedData.cdnBoundHost = "statics.xiumi.us"
injectedData.thumbCdnHost = "img.xiumi.us"
injectedData.DOCUMENT_SERVICE = { sendArticleUrl: "//wx.xiumi.us/article/postarticles", ... }
```

### 3. 浏览器实测：cn 首页零 API 请求

Playwright 打开 `https://xiumius.cn/`，6 秒内：

```
请求域名：
    20  xiumius.cn
其中 API 调用：
    (无)
```

20 个请求全是静态资源（CSS / JS / 图标），**一次 `/api/*` 都没发**。

对比 `https://xiumi.us/`：

```
最终 URL : https://xiumi.us/#/          ← 跳到哈希路由
请求域名 :
    12  xiumi.us
     8  edt.xiumius.cn                  ← 应用 bundle 从 cn 域名的 CDN 取
     7  statics.xiumi.us
其中 API 调用：
    GET xiumi.us/api/user/info
    GET xiumi.us/api/home_slogans
```

**注意分工是反的**：cn 域名提供 JS 资源，us 域名提供 API。

### 4. 登录态不跨域，而且跨域调用被 CORS 拦

浏览器里 sid 的实际形态：

```
sid   domain=xiumi.us      path=/  httpOnly=true   sameSite=None
```

`domain` 是 `xiumi.us`（**没有前导点**）—— 严格绑定这一个主机，`xiumius.cn` 拿不到。

在 cn 页面上下文里直接调 us 的 API：

```js
// 在 https://xiumius.cn/ 页面里执行
await fetch('https://xiumi.us/auth/me', { credentials: 'include' })
// → TypeError: Failed to fetch        ← CORS 直接拦掉

await fetch('/auth/me', { credentials: 'include' })
// → 404 text/html Code: NoSuchKey     ← 相对路径落到 COS 桶
```

所以**不存在「cn 站登录后去 us 站操作」这种路径**，反过来也不存在。

## 实际操作影响

| 问题 | 答案 |
|---|---|
| 要不要分别逆向两套 API？ | **不用**。cn 域名没有 API，只有 `xiumi.us` 一套 |
| 客户端 `BASE` 该填哪个？ | `https://xiumi.us`（现有 `client/xiumi.mjs` 已是这个值，无需改动） |
| 账号在 cn 站注册的和 us 站是同一个吗？ | 是。cn 站的「登录」按钮就指向 `https://xiumi.us/auth` |
| 在 us 上创建的作品，cn 站能看到吗？ | 同一份数据。作品公开页域名是 `v.xiumi.us` / `v.xiumius.cn`，数据在 us 的 API |
| 静态资源要从哪抓？ | `edt.xiumius.cn`（编辑器/主页 bundle）+ `xiumius.cn`（资源桶），两个都是 cn 域名 |
| `xiumius.cn/user/setting.html` 能用吗？ | 不能，404。功能页全在 us |

**一句话**：cn 域名是「门面和仓库」，us 域名是「唯一的应用机房」。
逆向只要打 us；找 bundle 要去 cn。

## 复现命令

```bash
cd <repo>
node scripts/scaffold/_interop.mjs           # 纯 HTTP：API 归属、cookie 作用域
node scripts/scaffold/_interop_static.mjs    # 静态：cn 首页 href / injectedData 配置
node scripts/scaffold/_interop_browser.mjs   # 浏览器：运行时请求域名、CORS 实测
```

日志落在 `capture/_interop.log` / `_interop_static.log` / `_interop_browser.log`。
