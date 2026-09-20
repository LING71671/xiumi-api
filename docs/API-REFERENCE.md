# 秀米（xiumi.us）全站 API 参考

> 本文档由 `scripts/gen_docs.mjs` 自动生成，数据来源三路合并：
> 1. **bundle 静态提取** — 四个前端包中所有接口调用点（含未在 UI 触达的写接口）
> 2. **真实流量录制** — Playwright 登录后遍历 38 条路由的 3100+ 条请求
> 3. **只读探测** — 带着登录态对每个 GET 接口实发一次请求，记录状态码与响应结构
>
> 生成时间：2026-09-20T15:42:44.085Z
>
> 接口总数 **308**；其中真实流量验证 55 条，
> 只读探测 2xx 84 条。

## 通用约定

| 项 | 值 |
|---|---|
| 应用前端 | `https://xiumi.us`（AngularJS SPA，哈希路由 `#/`） |
| 静态资源 CDN | `https://edt.xiumius.cn` |
| 读写接口前缀 | `https://xiumi.us/api/...` |
| 站点级接口 | `https://xiumi.us/auth/...`（登录、登出、当前用户） |
| 图片/静态资源 | `https://statics.xiumi.us`、`https://img.xiumi.us` |
| 作品展示页 | `https://v.xiumi.us/board/v5/{发布者}/{作品ID}` |
| 个人主页 | `https://v.xiumius.cn/u/{user_sid}` |
| 鉴权方式 | Cookie `sid`（HttpOnly / Secure / SameSite=None，有效期 3 天） |
| 统一响应体 | `{"code":0,"message":"Common:OK","data":...}`，`code=0` 为成功 |
| AJAX 约定 | 普通页面请求带 `X-Requested-With: XMLHttpRequest`；写接口用 `Content-Type: application/json` |

---

## 模块 `admin`

管理端：模板元数据与系统标签（普通用户不可用）

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/api/admin/template/meta` | ⚪ 仅静态（bundle 提取） | — |
| `GET` | `/api/admin/template/system/tag/drop` | ⚪ 仅静态（bundle 提取） | — |
| `GET` | `/api/admin/template/system/tag/new` | 🟡 已探测（只读 GET） | — |

## 模块 `agreement`

其它/未归类

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `PUT` | `/auth/agreement/access` | ⚪ 仅静态（bundle 提取） | — |
| `PUT` | `/auth/agreement/reject` | ⚪ 仅静态（bundle 提取） | — |

## 模块 `apikey`

开放 API 密钥管理

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `DELETE / GET / PATCH / POST` | `/api/apikey` | ✅ 已实测（真实流量） | — |

<details>
<summary>响应样本（1 条）</summary>

**`DELETE /api/apikey`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "apiKeys": [],
    "currentCount": 0,
    "availableCount": 2,
    "totalCount": 2,
    "capability": {
      "prohibited": true,
      "message": "您的 API Key 功能已被管理员禁用"
    }
  }
}
```

</details>

## 模块 `assets`

素材库：图片/音频/视频上传、标签分类、CDN 直传

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `DELETE / GET / POST` | `/api/assets` | 🟡 已探测（只读 GET） | tag, team_id |
| `GET` | `/api/assets/audio/file` | 🟡 已探测（只读 GET） | audio_file, updateTsIfExisted |
| `DELETE` | `/api/assets/cert/file` | ⚪ 仅静态（bundle 提取） | cert_file, updateTsIfExisted |
| `POST` | `/api/assets/clearimages` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/assets/image/cosobj` | ⚪ 仅静态（bundle 提取） | object_name, team_id, watermark |
| `POST` | `/api/assets/image/data` | ⚪ 仅静态（bundle 提取） | base64, filename, limit, team_id |
| `POST` | `/api/assets/image/file` | ⚪ 仅静态（bundle 提取） | formData |
| `POST` | `/api/assets/image/fromAnyStorage` | ⚪ 仅静态（bundle 提取） | imagelinks |
| `POST` | `/api/assets/image/imagedata` | ⚪ 仅静态（bundle 提取） | image_data, team_id |
| `POST` | `/api/assets/image/outlink` | ⚪ 仅静态（bundle 提取） | image_url, team_id, updateTsIfExisted |
| `POST` | `/api/assets/image/qqmap` | ⚪ 仅静态（bundle 提取） | lat, lng, team_id |
| `POST` | `/api/assets/image/svgContent` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/assets/image/wxlink` | ⚪ 仅静态（bundle 提取） | fileNames, imagelinks, tag, team_id |
| `GET` | `/api/assets/list/audio` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/assets/list/image` | 🟡 已探测（只读 GET） | limit, offset, search, team_id |
| `GET` | `/api/assets/list/image/count` | 🟡 已探测（只读 GET） | limit, offset, team_id |
| `GET` | `/api/assets/list/image/used` | 🟡 已探测（只读 GET） | limit, offset, team_id |
| `GET` | `/api/assets/list/video` | 🟡 已探测（只读 GET） | limit, offset, team_id |
| `GET` | `/api/assets/list/video/count` | 🟡 已探测（只读 GET） | team_id |
| `GET` | `/api/assets/list/video/used` | 🟡 已探测（只读 GET） | team_id |
| `?` | `/api/assets/psd/file` | 🟡 已探测（只读 GET） | layout, psd_file, text2image |
| `POST` | `/api/assets/tagsset` | ⚪ 仅静态（bundle 提取） | tags_set |
| `DELETE` | `/api/assets/type/image/tag` | ⚪ 仅静态（bundle 提取） | team_id |
| `GET` | `/api/assets/type/image/tag/assets` | 🟡 已探测（只读 GET） | limit, offset, tag, team_id |
| `POST` | `/api/assets/type/image/tag/rename` | ⚪ 仅静态（bundle 提取） | new_tag, old_tag, team_id |
| `DELETE / GET / POST` | `/api/assets/type/image/tags` | 🟡 已探测（只读 GET） | team_id |
| `GET / POST` | `/api/assets/type/image/tagsorder` | ✅ 已实测（真实流量） | order, team_id |
| `GET` | `/api/assets/type/image/untags` | 🟡 已探测（只读 GET） | limit, offset, tag, team_id |
| `DELETE` | `/api/assets/type/image/untags/clearimages` | ⚪ 仅静态（bundle 提取） | limit, team_id |
| `POST` | `/api/assets/video/cosobj` | ⚪ 仅静态（bundle 提取） | object_name, team_id, updateTsIfExisted |
| `POST` | `/api/assets/video/file` | ⚪ 仅静态（bundle 提取） | formData |
| `POST` | `/api/assets/video/ossobj` | ⚪ 仅静态（bundle 提取） | object_name, team_id, updateTsIfExisted |

<details>
<summary>响应样本（1 条）</summary>

**`GET /api/assets/type/image/tagsorder`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": "OK"
}
```

</details>

## 模块 `audio`

音频素材库：分类、来源、列表

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/audio/audio_list` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/audio/category_list` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/audio/source_list` | 🟡 已探测（只读 GET） | — |

## 模块 `auth`

登录 / 注册 / 第三方绑定 / 开放平台（`/api/auth/*` 与站点级 `/auth/*`）

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/api/auth/email/reset_password` | ⚪ 仅静态（bundle 提取） | code, email, password |
| `GET` | `/api/auth/login-captcha` | ✅ 已实测（真实流量） | area_code, username, area_code(query), username(query) |
| `GET` | `/api/auth/partner/ownerpartnerapp` | ✅ 已实测（真实流量） | unique_uid |
| `DELETE / POST / PUT` | `/api/auth/partner/partnerapp` | ⚪ 仅静态（bundle 提取） | — |
| `GET` | `/api/auth/partner/partnerapp/applications` | 🟡 已探测（只读 GET） | unique_uid |
| `GET` | `/api/auth/partner/partnerapp/ownerpartnerapp` | 🟡 已探测（只读 GET） | unique_uid |
| `DELETE` | `/api/auth/partner/partnerapp/ownerunbind` | ⚪ 仅静态（bundle 提取） | e |
| `PUT` | `/api/auth/partner/partnerapp/resetsecret` | ⚪ 仅静态（bundle 提取） | — |
| `DELETE` | `/api/auth/partner/partnerapp/unbind` | ⚪ 仅静态（bundle 提取） | e, unique_uid |
| `GET` | `/api/auth/partner/partnerappbind` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/auth/partner/partnerappbindlist` | ✅ 已实测（真实流量） | unique_uid |
| `GET` | `/api/auth/partner/partnerbind` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/auth/partnerinfo` | 🟡 已探测（只读 GET） | — |
| `POST` | `/api/auth/register_phone` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/auth/reset_password` | ⚪ 仅静态（bundle 提取） | area_code, code, password, phone |

<details>
<summary>响应样本（3 条）</summary>

**`GET /api/auth/login-captcha`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": false
}
```

**`GET /api/auth/partner/ownerpartnerapp`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": []
}
```

**`GET /api/auth/partner/partnerappbindlist`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "binds": [],
    "BIND_PARTNER_DOCUMENT_SERVICE": {
      "taurusLoginApi": "https://xmapi.xiumi.us/user/login",
      "sendArticleUrl": "https://xmapi.xiumi.us/article/postpartnerarticles",
      "sendAssetUrl": "https://xmapi.xiumi.us/resource/postpartnerresource"
    }
  }
}
```

</details>

## 模块 `bind_qq`

其它/未归类

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/auth/bind_qq` | ⚪ 仅静态（bundle 提取） | — |

## 模块 `bind_wechat`

其它/未归类

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/auth/bind_wechat` | ⚪ 仅静态（bundle 提取） | — |

## 模块 `bind_weibo`

其它/未归类

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/auth/bind_weibo` | ⚪ 仅静态（bundle 提取） | — |

## 模块 `comments`

评论系统：评论读写、权限、回收站、分享令牌

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `DELETE / GET` | `/api/comments` | 🟡 已探测（只读 GET） | ver |
| `GET` | `/api/comments/rights` | 🟡 已探测（只读 GET） | — |
| `POST` | `/api/comments/rights/team` | ⚪ 仅静态（bundle 提取） | team_id, team_name, ts |
| `POST` | `/api/comments/rights/trash/team` | ⚪ 仅静态（bundle 提取） | team_id |
| `POST` | `/api/comments/rights/trash/user` | ⚪ 仅静态（bundle 提取） | area_code, email, phone |
| `POST` | `/api/comments/rights/user` | ⚪ 仅静态（bundle 提取） | area_code, email, name, phone, ts |
| `GET` | `/api/comments/share/token` | 🟡 已探测（只读 GET） | — |

## 模块 `connect`

其它/未归类

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/auth/connect/user/access_code` | 🟡 已探测（只读 GET） | access_code, user_sid |

## 模块 `contacts`

联系人

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `DELETE` | `/api/contacts` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/contacts/add` | ⚪ 仅静态（bundle 提取） | condition, nickname, r, t |
| `GET` | `/api/contacts/list` | ✅ 已实测（真实流量） | limit, reverse, limit(query), reverse(query) |
| `POST` | `/api/contacts/update` | ⚪ 仅静态（bundle 提取） | condition, contacts_id, nickname |

<details>
<summary>响应样本（1 条）</summary>

**`GET /api/contacts/list`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": []
}
```

</details>

## 模块 `custom_domains`

自定义域名（团队/作品）

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `DELETE / GET / POST / PUT` | `/api/custom_domains` | 🟡 已探测（只读 GET） | cert_url, domain_name, key_url, team_id |
| `GET` | `/api/custom_domains/for/show` | 🟡 已探测（只读 GET） | — |

## 模块 `email`

邮箱验证与修改

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/api/email/auth` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/email/auth_action` | ⚪ 仅静态（bundle 提取） | action, code |
| `POST` | `/api/email/change_email` | ⚪ 仅静态（bundle 提取） | email |
| `POST` | `/api/email/reset_password` | ⚪ 仅静态（bundle 提取） | email, randstr, ticket |
| `POST` | `/api/email/validate_email` | ⚪ 仅静态（bundle 提取） | action |
| `POST / PUT` | `/auth/email/login` | ✅ 已实测（真实流量） | area_code, email, password |
| `GET` | `/auth/email/success` | ✅ 已实测（真实流量） | — |

## 模块 `fonts`

字体（有字库 webfont 接口）

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `?` | `/api/fonts/youziku/get_batch_woff_font_face` | 🟡 已探测（只读 GET） | — |

## 模块 `forms`

表单型 H5：表单数据查询、导出、字段设置

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/forms` | 🟡 已探测（只读 GET） | page, per_page |
| `DELETE / GET / PUT` | `/api/forms/count` | 🟡 已探测（只读 GET） | — |
| `DELETE / GET` | `/api/forms/data/forshow` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/forms/excel` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/forms/export` | 🟡 已探测（只读 GET） | export_all, export_type, file_type, per_page |
| `GET` | `/api/forms/query/export` | 🟡 已探测（只读 GET） | — |

## 模块 `fragment`

素材片段（单个）

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `DELETE` | `/api/fragment` | ⚪ 仅静态（bundle 提取） | — |

## 模块 `fragments`

素材片段（列表、上传、已用）

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/api/fragments` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/fragments/up` | ⚪ 仅静态（bundle 提取） | — |
| `GET` | `/api/fragments/used` | 🟡 已探测（只读 GET） | team_id |
| `DELETE / GET / POST` | `/api/fragments/v5` | 🟡 已探测（只读 GET） | limit, new_tag, offset, old_tag, order, tag, team_id |
| `POST` | `/api/fragments/v5/booklet/page/tagsorder` | ✅ 已实测（真实流量） | order |
| `POST` | `/api/fragments/v5/paper/comp/tagsorder` | ✅ 已实测（真实流量） | order |

<details>
<summary>响应样本（2 条）</summary>

**`POST /api/fragments/v5/booklet/page/tagsorder`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": "OK"
}
```

**`POST /api/fragments/v5/paper/comp/tagsorder`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": "OK"
}
```

</details>

## 模块 `help`

帮助中心：搜索、推荐、校验

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `DELETE` | `/api/help` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/help/add` | ⚪ 仅静态（bundle 提取） | doc_type, key, overwrite, recursive |
| `DELETE` | `/api/help/check` | ⚪ 仅静态（bundle 提取） | — |
| `DELETE / GET / POST` | `/api/help/recommended` | ✅ 已实测（真实流量） | type, type(query) |
| `GET` | `/api/help/search` | 🟡 已探测（只读 GET） | key, limit, nostat, offset, type |

<details>
<summary>响应样本（1 条）</summary>

**`DELETE /api/help/recommended`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": [
    {
      "recommended_help_id": 3,
      "URL": "https://v.xiumi.us/board/v5/2a5va/16979151",
      "title": "示例标题e688",
      "type": 2,
      "type_text": "article",
      "created_at": "2019-07-29T02:15:00.000Z",
      "updated_at": "2019-08-14T02:10:44.000Z"
    },
    {
      "recommended_help_id": 12,
      "URL": "https://v.xiumi.us/board/v5/2a5va/6103144",
      "title": "示例标题3f33",
      "type": 2,
      "type_text": "article",
      "created_at": "2024-12-26T05:53:11.000Z",
      "updated_at": "2024-12-26T05:53:11.000Z"
    },
    {
      "recommended_help_id": 14,
      "URL": "https://jinshuju.net/f/wOkl9U",
      "title": "示例标题f397",
      "type": 2,
      "type_text": "article",
      "created_at": "2021-03-26T05:56:10.000Z",
      "updated_at": "2024-05-20T02:40:23.000Z"
    },
    {
      "recommended_help_id": 19,
      "URL": "https://yuanqi.tencent.com/agent/qm99sNY8GEVk?from=share",
      "title": "示例标题7140",
      "type": 2,
      "type_text": "article",
      "created_at": "2024-12-12T07:09:41.000Z",
      "updated_at": "2025-03-18T02:00:17.000Z"
    }
  ]
}
```

</details>

## 模块 `home_slogans`

首页标语

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/home_slogans` | ✅ 已实测（真实流量） | — |

<details>
<summary>响应样本（1 条）</summary>

**`GET /api/home_slogans`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": [
    {
      "slogan_id": 42,
      "thumb_uri": "//statics.xiumi.us/stc/images/slogan/practices.jpg",
      "target_uri": "https://v.xiumi.us/board/v5/2a5va/390085751",
      "state": 1,
      "bg_color": "",
      "bg_uri": "",
      "created_at": "2017-08-30T10:55:41.000Z",
      "updated_at": "2017-08-30T10:55:46.000Z"
    },
    {
      "slogan_id": 43,
      "thumb_uri": "//statics.xiumi.us/stc/images/slogan/xiumi-scenarios-new.jpg",
      "target_uri": "https://v.xiumi.us/board/v5/2a5va/506017761",
      "state": 1,
      "bg_color": "",
      "bg_uri": "",
      "created_at": "2022-04-20T11:42:22.000Z",
      "updated_at": "2022-04-20T11:42:25.000Z"
    },
    {
      "slogan_id": 44,
      "thumb_uri": "//statics.xiumi.us/stc/images/slogan/manuscript-markdown.jpg",
      "target_uri": "https://v.xiumi.us/board/v5/2a5va/552598094",
      "state": 1,
      "bg_color": "",
      "bg_uri": "",
      "created_at": "2023-05-17T11:30:17.000Z",
      "updated_at": "2023-05-17T11:30:20.000Z"
    },
    {
      "slogan_id": 46,
      "thumb_uri": "//statics.xiumi.us/stc/images/slogan/jiegouhua-new.jpg",
      "target_uri": "https://v.xiumi.us/board/v5/2a5va/530192417",
      "state": 1,
      "bg_color": "",
      "bg_uri": "",
      "created_at": "2019-12-11T13:55:41.000Z",
      "updated_at": "2019-12-11T13:55:44.000Z"
    }
  ]
}
```

</details>

## 模块 `htmlCode`

HTML 代码校验

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/api/htmlCode/verify` | ⚪ 仅静态（bundle 提取） | html |

## 模块 `invitation`

邀请注册

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/invitation` | 🟡 已探测（只读 GET） | — |

## 模块 `invoices`

发票申请与管理

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `DELETE / GET / POST / PUT` | `/api/invoices` | 🟡 已探测（只读 GET） | include, limit, offset, orderBy |
| `GET` | `/api/invoices/available` | ✅ 已实测（真实流量） | include, include(query) |
| `GET` | `/api/invoices/count` | ✅ 已实测（真实流量） | limit, offset, orderBy |
| `GET` | `/api/invoices/lastinvoice` | ✅ 已实测（真实流量） | — |
| `GET` | `/api/invoices/list` | 🟡 已探测（只读 GET） | limit, offset, orderBy |
| `POST` | `/api/invoices/require` | ⚪ 仅静态（bundle 提取） | — |
| `DELETE` | `/api/invoices/revoke` | ⚪ 仅静态（bundle 提取） | — |

<details>
<summary>响应样本（3 条）</summary>

**`GET /api/invoices/available`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "min_invoice": 0.01,
    "total_paid": null,
    "available_invoice": 0
  }
}
```

**`GET /api/invoices/count`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": 0
}
```

**`GET /api/invoices/lastinvoice`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": null
}
```

</details>

## 模块 `issues`

问题反馈

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/api/issues` | ⚪ 仅静态（bundle 提取） | report_data |

## 模块 `login_history`

登录历史记录

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/login_history` | 🟡 已探测（只读 GET） | — |

## 模块 `logout`

其它/未归类

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/auth/logout` | ⚪ 仅静态（bundle 提取） | — |

## 模块 `me`

其它/未归类

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/auth/me` | 🟡 已探测（只读 GET） | — |

## 模块 `messages`

消息与通知设置

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET / POST` | `/api/messages` | ✅ 已实测（真实流量） | limit, page, state, limit(query), page(query), state(query) |
| `POST` | `/api/messages/mute_be_saved_to` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/messages/mute_invitation` | ⚪ 仅静态（bundle 提取） | — |
| `GET` | `/api/messages/mute_new_show` | 🟡 已探测（只读 GET） | — |
| `POST` | `/api/messages/setting/mute_be_saved_to` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/messages/setting/mute_invitation` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/messages/setting/mute_new_show` | ⚪ 仅静态（bundle 提取） | — |
| `GET` | `/api/messages/settings` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/messages/settings/` | ✅ 已实测（真实流量） | — |
| `GET` | `/api/messages/status` | ✅ 已实测（真实流量） | — |

<details>
<summary>响应样本（3 条）</summary>

**`GET /api/messages`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": []
}
```

**`GET /api/messages/settings/`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "mute_invitation": 0,
    "mute_be_saved_to": 0,
    "mute_new_show": 0,
    "user_id": 28745337
  }
}
```

**`GET /api/messages/status`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "totalCount": 0,
    "unreadCount": 0,
    "importanCount": 0
  }
}
```

</details>

## 模块 `mobile_wechat`

其它/未归类

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `?` | `/auth/mobile_wechat` | 🟡 已探测（只读 GET） | — |

## 模块 `nlp`

文本智能处理（标题提取）

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/api/nlp/extract_headings` | ⚪ 仅静态（bundle 提取） | textElements |
| `GET` | `/api/nlp/extract_headings2` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/nlp/extract_headings2/tasks/{param}` | ⚪ 仅静态（bundle 提取） | — |
| `?` | `/api/nlp/extract_headings2/word/{param}` | ⚪ 仅静态（bundle 提取） | — |

## 模块 `notify`

系统通知推送

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/notify` | ✅ 已实测（真实流量） | — |

<details>
<summary>响应样本（1 条）</summary>

**`GET /api/notify`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": null
}
```

</details>

## 模块 `orders`

订单与支付：下单、支付、充值、转账、提现、企业团队账单

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET / POST` | `/api/orders` | ✅ 已实测（真实流量） | limit, offset, limit(query), offset(query) |
| `GET` | `/api/orders/for/create_order` | 🟡 已探测（只读 GET） | — |
| `GET / POST` | `/api/orders/for/enterprise_team` | 🟡 已探测（只读 GET） | amount, day_count, member_count |
| `POST` | `/api/orders/for/order_pay` | ⚪ 仅静态（bundle 提取） | order_id, pay_type |
| `POST` | `/api/orders/for/show_goods` | ⚪ 仅静态（bundle 提取） | show_goods_id, special_offer, use_wallet |
| `GET` | `/api/orders/for/special_offer` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/orders/for/team_wallet` | 🟡 已探测（只读 GET） | limit, offset |
| `GET` | `/api/orders/for/team_wallet_detail` | 🟡 已探测（只读 GET） | offset |
| `POST` | `/api/orders/for/team_wallet_transfer` | ⚪ 仅静态（bundle 提取） | member_id, team_id, transferAmount |
| `POST` | `/api/orders/for/tpl_show_goods` | ⚪ 仅静态（bundle 提取） | show_goods_id |
| `POST` | `/api/orders/for/wallet_recharge` | ⚪ 仅静态（bundle 提取） | amount, offset, pay_type, team_id |
| `POST` | `/api/orders/for/wallet_redeem` | ⚪ 仅静态（bundle 提取） | redeemCode |
| `POST` | `/api/orders/for/wallet_transfer` | ⚪ 仅静态（bundle 提取） | area_code, limit, transferAmount, transferTargetCondition |
| `POST` | `/api/orders/for/withdraw_cash` | ⚪ 仅静态（bundle 提取） | amount |
| `GET` | `/api/orders/tariff/for/enterprise_team` | 🟡 已探测（只读 GET） | upgrade_type |
| `GET` | `/api/orders/tariff/for/level/upgrading` | ✅ 已实测（真实流量） | email, team_id |
| `GET` | `/api/orders/tariff/for/templated_membership/upgrading` | ✅ 已实测（真实流量） | email |
| `GET` | `/api/orders/tariff/for/traffic_package` | ✅ 已实测（真实流量） | email, team_id |

<details>
<summary>响应样本（4 条）</summary>

**`GET /api/orders`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "count": 0,
    "orders": []
  }
}
```

**`GET /api/orders/tariff/for/level/upgrading`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "target_user": {
      "user_sid": "l0TvI",
      "unique_uid": "0123456789abcdef0123456789abcdef",
      "nickname": "示例用户8295",
      "avatar_url": null,
      "brand_name": null,
      "level": 1,
      "sub_account": 0,
      "userpage_url": "https://v.xiumius.cn/u/l0TvI",
      "location": "示例地区",
      "hasPassword": true,
      "agreement_access": 1,
      "area_code": 86,
      "phone": "13800000000",
      "email": null,
      "isBindQQ": true,
      "isBindWeibo": false,
      "isBindWx": false,
      "isBindApple": false,
      "qq_qd_uin": null,
      "partner_uid": null,
      "level_remain_life": 0,
      "levelLimit": {
        "version": 1,
        "fragmentLimit": 100,
        "showLimit": 30,
        "showPageLimit": 300,
        "articleLimit": 30,
        "articlePageLimit": 1000,
        "upImageNumLimit": 100,
        "upImageSizeLimit": 10485760,
        "upAudioNumLimit": 10,
        "upAudioSizeLimit": 10485760,
        "upVideoNumLimit": 10,
        "upVideoSizeLimit": 20971520,
        "teamCountLimit": 1,
        "teamMemCountLimit": 10,
        "formDataCountLimit": 100
      }
    },
    "payment_list": [
      {
        "level": 4,
        "remainLife": 30,
        "amount": 10,
        "api": "/api/orders/for/level_upgrading"
      },
      {
        "level": 4,
        "remainLife": 90,
        "amount": 30,
        "api": "/api/orders/for/level_upgrading"
      },
      {
        "level
```

**`GET /api/orders/tariff/for/templated_membership/upgrading`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "target_user": {
      "user_sid": "l0TvI",
      "unique_uid": "0123456789abcdef0123456789abcdef",
      "nickname": "示例用户8295",
      "avatar_url": null,
      "brand_name": null,
      "level": 1,
      "sub_account": 0,
      "userpage_url": "https://v.xiumius.cn/u/l0TvI",
      "location": "示例地区",
      "hasPassword": true,
      "agreement_access": 1,
      "area_code": 86,
      "phone": "13800000000",
      "email": null,
      "isBindQQ": true,
      "isBindWeibo": false,
      "isBindWx": false,
      "isBindApple": false,
      "qq_qd_uin": null,
      "partner_uid": null,
      "level_remain_life": 0,
      "levelLimit": {
        "version": 1,
        "fragmentLimit": 100,
        "showLimit": 30,
        "showPageLimit": 300,
        "articleLimit": 30,
        "articlePageLimit": 1000,
        "upImageNumLimit": 100,
        "upImageSizeLimit": 10485760,
        "upAudioNumLimit": 10,
        "upAudioSizeLimit": 10485760,
        "upVideoNumLimit": 10,
        "upVideoSizeLimit": 20971520,
        "teamCountLimit": 1,
        "teamMemCountLimit": 10,
        "formDataCountLimit": 100
      }
    },
    "payment_list": [
      {
        "level": "1m",
        "remainLife": 30,
        "amount": 20,
        "api": "/api/orders/for/templated_membership"
      },
      {
        "level": "3m",
        "remainLife": 90,
        "amount": 60,
        "api": "/api/orders/for/templated_membership"
      },
      
```

**`GET /api/orders/tariff/for/traffic_package`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "target_user": {
      "user_sid": "l0TvI",
      "unique_uid": "0123456789abcdef0123456789abcdef",
      "nickname": "示例用户8295",
      "avatar_url": null,
      "brand_name": null,
      "level": 1,
      "sub_account": 0,
      "userpage_url": "https://v.xiumius.cn/u/l0TvI",
      "location": "示例地区",
      "hasPassword": true,
      "agreement_access": 1,
      "area_code": 86,
      "phone": "13800000000",
      "email": null,
      "isBindQQ": true,
      "isBindWeibo": false,
      "isBindWx": false,
      "isBindApple": false,
      "qq_qd_uin": null,
      "partner_uid": null,
      "level_remain_life": 0,
      "levelLimit": {
        "version": 1,
        "fragmentLimit": 100,
        "showLimit": 30,
        "showPageLimit": 300,
        "articleLimit": 30,
        "articlePageLimit": 1000,
        "upImageNumLimit": 100,
        "upImageSizeLimit": 10485760,
        "upAudioNumLimit": 10,
        "upAudioSizeLimit": 10485760,
        "upVideoNumLimit": 10,
        "upVideoSizeLimit": 20971520,
        "teamCountLimit": 1,
        "teamMemCountLimit": 10,
        "formDataCountLimit": 100
      }
    },
    "payment_list": [
      {
        "amount": 5,
        "remainLife": 1000,
        "allow": true,
        "level": null,
        "api": "/api/orders/for/traffic_package"
      },
      {
        "amount": 25,
        "remainLife": 5000,
        "allow": true,
        "level": null,
        "api": "/api/orde
```

</details>

## 模块 `publisher`

发布者身份

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `DELETE / GET / POST` | `/api/publisher/identity` | ✅ 已实测（真实流量） | team_id, team_id(query) |

<details>
<summary>响应样本（1 条）</summary>

**`DELETE /api/publisher/identity`**

```json
{
  "code": 0,
  "message": "Common:OK"
}
```

</details>

## 模块 `qq`

其它/未归类

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `?` | `/auth/qq` | 🟡 已探测（只读 GET） | — |

## 模块 `qrimage`

二维码图片生成任务

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/qrimage/progress` | 🟡 已探测（只读 GET） | token |
| `DELETE / POST` | `/api/qrimage/token` | ⚪ 仅静态（bundle 提取） | tag, team_id, watermark |

## 模块 `qrshare`

二维码分享（作品分享图）

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/api/qrshare/show/save` | ⚪ 仅静态（bundle 提取） | share_token |
| `POST` | `/api/qrshare/show/share` | ⚪ 仅静态（bundle 提取） | show_id |

## 模块 `renderer`

服务端渲染/导出：截图、GIF、视频、PDF、帧图

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/renderer/comp/show` | 🟡 已探测（只读 GET） | nopadding, quality |
| `GET` | `/api/renderer/export` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/renderer/frames/show` | 🟡 已探测（只读 GET） | end_page, frequence, poster_path, quality, scroll_speed, start_page, storage_target, transparent_bg, turning_interval |
| `GET` | `/api/renderer/gif/show` | 🟡 已探测（只读 GET） | end_page, frequence, poster_path, quality, repeat, scroll_speed, start_page, storage_target, transparent_bg, turning_interval |
| `GET` | `/api/renderer/pdf/show` | 🟡 已探测（只读 GET） | no_padding, page_height, page_width, quality |
| `GET` | `/api/renderer/screenshot/show` | 🟡 已探测（只读 GET） | combine_dir, end_page, file_type, no_padding, page_height, page_indicators, page_width, poster_path, quality, start_page, storage_target, transparent_bg |
| `GET` | `/api/renderer/video/show` | 🟡 已探测（只读 GET） | page_width, quality, scroll_speed, turning_interval, use_music |

## 模块 `report`

其它/未归类

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/auth/report/result/failed` | 🟡 已探测（只读 GET） | delay_time, loadingUserInfo, requirePhoneBind, signingIn, signingOut, uploadCdnHost, uploadCfgs, uploadToOss, userInfo |
| `GET` | `/auth/report/result/success` | 🟡 已探测（只读 GET） | delay_time, loadingUserInfo, requirePhoneBind, signingIn, signingOut, uploadCdnHost, uploadCfgs, uploadToOss, userInfo |

## 模块 `show`

单个作品的即时操作（V5 保存入口）

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/show` | 🟡 已探测（只读 GET） | — |
| `POST` | `/api/show/collect_img/5` | ⚪ 仅静态（bundle 提取） | showData |
| `POST` | `/api/show/scan_image_infringement/5` | ⚪ 仅静态（bundle 提取） | showData |

## 模块 `show_goods`

模板商城：商品、上架、投稿、收入

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/show_goods/application/originality_file_upload` | 🟡 已探测（只读 GET） | formData |
| `GET / POST / PUT` | `/api/show_goods/applications` | 🟡 已探测（只读 GET） | access_token, is_new_original_file, originality_file_url, price, reason, show_goods_id, show_id, tag_id, template_membership_flag |
| `DELETE / PUT` | `/api/show_goods/applications/revoke` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/show_goods/author/applying` | ⚪ 仅静态（bundle 提取） | home_url, state |
| `GET` | `/api/show_goods/author/state` | ✅ 已实测（真实流量） | — |
| `GET` | `/api/show_goods/expected_income` | 🟡 已探测（只读 GET） | show_type, utc_ticks |
| `GET` | `/api/show_goods/goodses` | ✅ 已实测（真实流量） | by_nearest, limit, page, price_scope, search, show_type, showgoods_type, tag_id, tag_name, tpl_flag, utc_ticks, by_nearest(query), limit(query), page(query) |
| `PUT` | `/api/show_goods/goodses/assign_tags` | ⚪ 仅静态（bundle 提取） | inTags, outTags, relatedFlag, show_goods_id |
| `PUT` | `/api/show_goods/goodses/change_price` | ⚪ 仅静态（bundle 提取） | show_goods_id |
| `PUT` | `/api/show_goods/goodses/stopSale` | ⚪ 仅静态（bundle 提取） | show_goods_id |
| `GET` | `/api/show_goods/my/applications` | 🟡 已探测（只读 GET） | application_type, limit, page, state |
| `GET / POST` | `/api/show_goods/my/goodses` | 🟡 已探测（只读 GET） | limit, page, state |
| `GET` | `/api/show_goods/my/incomes/goodses` | ✅ 已实测（真实流量） | limit, page, payedOnly, scopeType, state, limit(query), page(query), payedOnly(query), scopeType(query), state(query) |
| `GET` | `/api/show_goods/my/info` | 🟡 已探测（只读 GET） | include, show_type |
| `GET` | `/api/show_goods/my/purchased/goodses` | ✅ 已实测（真实流量） | limit, page, show_type, limit(query), page(query), show_type(query) |
| `GET` | `/api/show_goods/my/purchased/state` | 🟡 已探测（只读 GET） | include, show_goods_id |
| `GET` | `/api/show_goods/official_recommended` | 🟡 已探测（只读 GET） | limit, page, show_type |
| `POST` | `/api/show_goods/purchased/goodses` | ⚪ 仅静态（bundle 提取） | show_goods_id |
| `GET` | `/api/show_goods/rank` | 🟡 已探测（只读 GET） | limit, page, range_from, range_to, rank_object, show_type |
| `GET` | `/api/show_goods/tags_tree` | ✅ 已实测（真实流量） | show_goods, show_type, tag_level_from, tag_level_to, show_goods(query), show_type(query), tag_level_from(query), tag_level_to(query) |
| `GET` | `/api/show_goods/tpl_goods/bought/state` | 🟡 已探测（只读 GET） | n |
| `GET` | `/api/show_goods/tpl_goods/count` | ✅ 已实测（真实流量） | utc_ticks |

<details>
<summary>响应样本（6 条）</summary>

**`GET /api/show_goods/author/state`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "state": "never-apply"
  }
}
```

**`GET /api/show_goods/goodses`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "count": 96453,
    "goodses": [
      {
        "show_goods_id": 159063,
        "show_id": 726575728,
        "price": 10,
        "priority": 0,
        "state": 0,
        "state_text": "on_sale",
        "copy_number": 67,
        "collected_number": 172,
        "weight": 824676,
        "created_at": "2026-09-18T08:52:04.000Z",
        "updated_at": "2026-09-20T12:57:52.000Z",
        "show": {
          "show_id": 726575728,
          "type": 2,
          "version": 5,
          "usage_scenario": null,
          "title": "示例标题dd98",
          "desc": "中秋国庆放假通知校园卡通",
          "cover": "//img.xiumi.us/xmi/ua/tTTlJ/i/aa11bb22cc33dd44ee55ff6677889900-sz_362182.jpg?x-oss-process=style/xm",
          "loading_icon": null,
          "exif": {
            "viewport": {
              "STAGE_SIZE": "flow_scroll",
              "WIDTH": 415,
              "FONT_SIZE": 16
            },
            "canvasInformation": {}
          },
          "wechat_no_share": 0,
          "right_no_advert": 0,
          "right_vip_host": 1,
          "right_freeshow": 1,
          "right_access_privilege": 1,
          "right_form_closed": 0,
          "mask_no_modification": 0,
          "mask_on_locking": 0,
          "mask_pattern_fragment": 5,
          "traffic": 0,
          "points": 0,
          "history_hits": 1814,
          "saved_at": "2026-09-18T08:52:03.000Z",
          "release_applied_at": null,
          "release_at": 
```

**`GET /api/show_goods/my/incomes/goodses`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "count": 0,
    "goodses": [],
    "recentDay": null
  }
}
```

**`GET /api/show_goods/my/purchased/goodses`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "count": 0,
    "goodses": []
  }
}
```

**`GET /api/show_goods/tags_tree`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": [
    {
      "tag_id": 1,
      "tag_level": 2,
      "show_type": 2,
      "tag_name": "paper_root",
      "created_at": "2018-04-20T14:15:49.000Z",
      "updated_at": "2018-04-20T14:15:51.000Z",
      "show_type_text": "paper",
      "childTags": [
        {
          "tag_id": 12,
          "tag_level": 1,
          "show_type": 2,
          "tag_name": "用途",
          "created_at": "2018-04-24T02:16:12.000Z",
          "updated_at": "2018-04-24T02:16:12.000Z",
          "show_type_text": "paper",
          "childTags": [
            {
              "tag_id": 92,
              "tag_level": 0,
              "show_type": 2,
              "tag_name": "邀请函",
              "created_at": "2018-04-26T22:59:56.000Z",
              "updated_at": "2018-04-26T22:59:56.000Z",
              "show_type_text": "paper"
            },
            {
              "tag_id": 174,
              "tag_level": 0,
              "show_type": 2,
              "tag_name": "婚礼请柬",
              "created_at": "2018-05-31T01:40:43.000Z",
              "updated_at": "2021-08-17T03:05:40.000Z",
              "show_type_text": "paper"
            },
            {
              "tag_id": 91,
              "tag_level": 0,
              "show_type": 2,
              "tag_name": "公司宣传",
              "created_at": "2018-04-26T22:54:05.000Z",
              "updated_at": "2021-08-17T03:05:13.000Z",
              "show_type_text": "paper"
            },
       
```

**`GET /api/show_goods/tpl_goods/count`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": 0
}
```

</details>

## 模块 `show_goods_favorite_tags`

收藏夹分组标签

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/show_goods_favorite_tags` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/show_goods_favorite_tags/{param}/{param2}/show_goods` | ⚪ 仅静态（bundle 提取） | limit, page |
| `GET / POST` | `/api/show_goods_favorite_tags/{param}/order` | ⚪ 仅静态（bundle 提取） | order |
| `GET` | `/api/show_goods_favorite_tags/{param}/tagorder` | ⚪ 仅静态（bundle 提取） | — |
| `DELETE` | `/api/show_goods_favorite_tags/{show_type}/{param}/tags` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/show_goods_favorite_tags/paper/order` | ✅ 已实测（真实流量） | order |
| `GET` | `/api/show_goods_favorite_tags/paper/tagorder` | ✅ 已实测（真实流量） | — |
| `POST` | `/api/show_goods_favorite_tags/rename` | ⚪ 仅静态（bundle 提取） | new_tag, old_tag, show_type |
| `GET` | `/api/show_goods_favorite_tags/show_goods/{show_goods_id}/{show_goods_id2}` | ⚪ 仅静态（bundle 提取） | — |
| `DELETE` | `/api/show_goods_favorite_tags/show_goods/{show_goods_id}/{show_goods_id2}/{show_goods_id3}` | ⚪ 仅静态（bundle 提取） | — |
| `GET` | `/api/show_goods_favorite_tags/show_type/{param}` | ⚪ 仅静态（bundle 提取） | — |
| `DELETE` | `/api/show_goods_favorite_tags/show_type/{param}/{param2}` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/show_goods_favorite_tags/state/read` | ⚪ 仅静态（bundle 提取） | state |

<details>
<summary>响应样本（2 条）</summary>

**`POST /api/show_goods_favorite_tags/paper/order`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": "Added"
}
```

**`GET /api/show_goods_favorite_tags/paper/tagorder`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "tags": [],
    "tagsOrder": null
  }
}
```

</details>

## 模块 `show_goods_favorites`

商品收藏

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/show_goods_favorites` | ✅ 已实测（真实流量） | limit(query), page(query), search(query), show_type(query) |
| `DELETE` | `/api/show_goods_favorites/{param}` | ⚪ 仅静态（bundle 提取） | — |
| `GET` | `/api/show_goods_favorites/is_favorite/{param}` | ⚪ 仅静态（bundle 提取） | — |

<details>
<summary>响应样本（1 条）</summary>

**`GET /api/show_goods_favorites`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "count": 0,
    "goodses": []
  }
}
```

</details>

## 模块 `show_save_to_records`

作品保存记录

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/show_save_to_records` | 🟡 已探测（只读 GET） | limit, page, search, search_area |
| `GET` | `/api/show_save_to_records/count` | 🟡 已探测（只读 GET） | limit, page, search, search_area |

## 模块 `shows`

作品（图文 / H5 / 表单 / 海报）：列表、新建、删除、回收站、标签、导入微信文章

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `DELETE / GET / POST / PUT` | `/api/shows` | 🟡 已探测（只读 GET） | enableFullTextSearch, include, limit, offset, page, pattern_fragment, preview_for, reverse, search, show_type, sort_by, tag, team_id, to |
| `DELETE` | `/api/shows/{show_id}` | ⚪ 仅静态（bundle 提取） | — |
| `GET` | `/api/shows/by/pattfrag-tags` | 🟡 已探测（只读 GET） | limit, page, show_type, sort_by, team_id |
| `GET` | `/api/shows/by/tags` | 🟡 已探测（只读 GET） | enableFullTextSearch, limit, offset, page, pattern_fragment, reverse, search, show_type, sort_by, team_id |
| `GET` | `/api/shows/by/untag` | 🟡 已探测（只读 GET） | enableFullTextSearch, limit, page, pattern_fragment, search, show_type, sort_by, team_id |
| `GET` | `/api/shows/consume/traffic_package/shows` | ⚪ 仅静态（bundle 提取） | limit, page, team_id |
| `GET` | `/api/shows/count` | ✅ 已实测（真实流量） | enableFullTextSearch, pattern_fragment, search, show_type, version, show_type(query), version(query) |
| `GET` | `/api/shows/deleted/shows` | ✅ 已实测（真实流量） | enableFullTextSearch, limit, offset, page, search, show_type, version, limit(query), page(query), show_type(query), version(query) |
| `GET` | `/api/shows/from/official` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/shows/from/official2` | 🟡 已探测（只读 GET） | enableFullTextSearch, limit, page, pattern_fragment, search, show_type, sort_by, version |
| `GET` | `/api/shows/from/teams` | 🟡 已探测（只读 GET） | enableFullTextSearch, limit, offset, page, pattern_fragment, search, show_type, sort_by, version |
| `GET` | `/api/shows/from/teams/count` | 🟡 已探测（只读 GET） | pattern_fragment, version |
| `POST` | `/api/shows/getwxarticledata` | ⚪ 仅静态（bundle 提取） | articleurl, user_sid |
| `POST` | `/api/shows/importwxarticle` | ⚪ 仅静态（bundle 提取） | articleurl |
| `DELETE` | `/api/shows/pattfrag-tags/clear` | ⚪ 仅静态（bundle 提取） | team_id |
| `GET / POST` | `/api/shows/pattfrag-tags/order` | 🟡 已探测（只读 GET） | team_id |
| `POST` | `/api/shows/pattfrag-tags/rename` | ⚪ 仅静态（bundle 提取） | — |
| `GET / POST` | `/api/shows/recover` | ⚪ 仅静态（bundle 提取） | limit, offset |
| `POST` | `/api/shows/recover/{param}` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/shows/send` | ⚪ 仅静态（bundle 提取） | from_show_id, show_id, title_postfix |
| `DELETE / POST` | `/api/shows/tags/clear` | ⚪ 仅静态（bundle 提取） | team_id |
| `GET / POST` | `/api/shows/tags/order` | 🟡 已探测（只读 GET） | order, team_id |
| `DELETE / POST` | `/api/shows/tags/rename` | ⚪ 仅静态（bundle 提取） | new_tag, old_tag |
| `POST` | `/api/shows/v5` | ⚪ 仅静态（bundle 提取） | from_show_id, g, o |
| `GET` | `/api/shows/validate/teamshow` | 🟡 已探测（只读 GET） | — |

<details>
<summary>响应样本（2 条）</summary>

**`GET /api/shows/count`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": 0
}
```

**`GET /api/shows/deleted/shows`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "count": 0,
    "deletedShows": []
  }
}
```

</details>

## 模块 `sms`

短信验证码

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/api/sms/auth_action` | ⚪ 仅静态（bundle 提取） | action, code |
| `POST` | `/api/sms/auth_manual` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/sms/auth_skip` | ⚪ 仅静态（bundle 提取） | — |
| `POST` | `/api/sms/change_phone` | ⚪ 仅静态（bundle 提取） | area_code, phone |
| `POST` | `/api/sms/register_user` | ⚪ 仅静态（bundle 提取） | area_code, phone, randstr, ticket |
| `POST` | `/api/sms/reset_password` | ⚪ 仅静态（bundle 提取） | area_code, phone, randstr, ticket |
| `POST` | `/api/sms/validate_phone` | ⚪ 仅静态（bundle 提取） | action |

## 模块 `statistics`

数据统计（作品访问）

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/statistics/show` | 🟡 已探测（只读 GET） | count |

## 模块 `success`

其它/未归类

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/auth/success` | ✅ 已实测（真实流量） | — |

## 模块 `sys_info`

系统配置与限制值

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/sys_info` | ✅ 已实测（真实流量） | — |

<details>
<summary>响应样本（1 条）</summary>

**`GET /api/sys_info`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "node_env": "production",
    "version": "14.4.2",
    "cashWithdraw": {
      "minAmount": 10,
      "brokerageRate": 0.16,
      "taxRate": 0
    },
    "psd": {
      "maxFileSize": 31457280
    },
    "webfont": {
      "yzkWebSDKScriptURI": "/3rd/yzk-webfont/20200317/h5js.new.min.js",
      "yzkWebSDKServer": "webfont.xiumius.cn"
    },
    "assetUpload": {
      "configs": [
        "cdn",
        "ecs",
        "cos"
      ],
      "cdnHost": "https://upload.xiumius.cn"
    },
    "browserExtension": {
      "version": "0.0.7"
    },
    "DOCUMENT_SERVICE": {
      "sendArticleUrl": "//wx.xiumius.cn/article/postarticles",
      "sendAssetUrl": "//wx.xiumius.cn/resource/postresource",
      "geminiLoginApi": "//wx.xiumius.cn/user/login",
      "geminiTokenApi": "//wx.xiumius.cn/user/token",
      "fetchUserListApi": "//wx.xiumius.cn/authorization/authlist",
      "refreshUserListApi": "//wx.xiumius.cn/authorization/authlistrefresh",
      "removeUserApi": "//wx.xiumius.cn/authorization/removeauth",
      "sendPreviewApi": "//wx.xiumius.cn/article/previewarticle",
      "wxauthArticlesUrl": "//wx.xiumius.cn/article/weixinarticles",
      "wxauthArticleDataUrl": "//wx.xiumius.cn/article/weixinarticledata",
      "wxauthPublishedArticlesUrl": "//wx.xiumius.cn/article/weixinpublisharticles",
      "sendWxArticlesUrl": "//wx.xiumius.cn/article/sendarticlestoall",
      "wxArticleSentRecordUrl": "//wx.xiumius.cn/article
```

</details>

## 模块 `teams`

团队 / 企业版 / 子账号

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `DELETE / GET / POST / PUT` | `/api/teams` | ✅ 已实测（真实流量） | auth, desc, display_name, email, enterprise_member, info, member_visibility, right_public_create, role, role_type |
| `DELETE / POST / PUT` | `/api/teams/sub_account` | ⚪ 仅静态（bundle 提取） | email, password |

<details>
<summary>响应样本（1 条）</summary>

**`DELETE /api/teams`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": []
}
```

</details>

## 模块 `templates`

模板库：模板列表、标签树、可用模板

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/templates` | ✅ 已实测（真实流量） | keywords, limit, match_level, page, q, sort, tag_category, tag_ids, template_category, limit(query), match_level(query), page(query), q(query), sort(query) |
| `POST` | `/api/templates/allowed` | ⚪ 仅静态（bundle 提取） | resources |
| `GET` | `/api/templates/items` | ✅ 已实测（真实流量） | atom_tpl_id, atom_tpl_id(query) |
| `GET` | `/api/templates/tags` | 🟡 已探测（只读 GET） | tag_category, tag_level, tag_name |
| `GET` | `/api/templates/tags_tree` | ✅ 已实测（真实流量） | tag_category, tag_level_from, tag_level_to, template, tag_category(query), tag_level_from(query), tag_level_to(query), template(query) |

<details>
<summary>响应样本（3 条）</summary>

**`GET /api/templates`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "count": 21640,
    "templates": [
      {
        "template_id": 87689,
        "atom_tpl_id": "paper-cp:2026-9-11/53771",
        "display_name": "paper-cp:2026-9-11/53771",
        "category": 11,
        "category_text": "paper-cp",
        "accessibility": 100,
        "accessibility_text": "Public",
        "visibility": 100,
        "visibility_text": "All",
        "feature_requires": 0,
        "feature_requires_text": [],
        "order_num": 100,
        "version": 2,
        "matrix": [
          {
            "_comp": {
              "tplId": "paper-cp:layout/row1-r1c5",
              "constraint": {},
              "pose": {
                "position": "static",
                "width": null,
                "height": "auto"
              },
              "style": {
                "textAlign": "center",
                "justifyContent": "center",
                "display": "flex",
                "flexDirection": "row",
                "flexWrap": "nowrap",
                "marginTop": "10px",
                "marginRight": "0",
                "marginBottom": "10px",
                "marginLeft": "0"
              },
              "_$uuid": "comp-AoXD3YQ4EWKHqqdn"
            },
            "col1": {
              "type": "group",
              "constraint": {
                "childLayout": "static"
              },
              "style": {
                "verticalAlign": "middle",
                "alig
```

**`GET /api/templates/items`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": [
    {
      "template_id": 1,
      "atom_tpl_id": "booklet-cp:baseware/cimg-only",
      "display_name": "可裁剪图片",
      "category": 1,
      "category_text": "booklet-cp",
      "accessibility": 100,
      "accessibility_text": "Public",
      "visibility": 100,
      "visibility_text": "All",
      "feature_requires": 0,
      "feature_requires_text": [],
      "order_num": 2000,
      "version": 1,
      "matrix": {
        "_comp": {
          "constraint": {
            "enableFullImage": true,
            "opMenu": {
              "crop-image-merged": true
            },
            "pose": {
              "aspectRatio": 1
            }
          },
          "pose": {
            "width": 150,
            "aspectRatio": "1.0 origin"
          },
          "style": {},
          "tplId": "booklet-cp:baseware/cimg-only"
        },
        "cimg1": {
          "type": "crop-image",
          "src": "//statics.xiumi.us/stc/images/placeholder-img.jpg",
          "style": {
            "backgroundPosition": "center center",
            "backgroundRepeat": "no-repeat",
            "backgroundSize": "cover"
          },
          "constraint": {
            "changeViewPort": true
          }
        }
      },
      "renderer_accelerate": "<div class=\"tn-comp-anim-pin tn-comp tn-from-house-booklet-cp\" style=\"width: 150px; height: 150px;\"><section class=\"tn-comp-pin tn-comp-style-pin\"><div tn-cell-type=\"crop-image\" st
```

**`GET /api/templates/tags_tree`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": [
    {
      "tag_id": 1,
      "tag_level": 2,
      "tag_category": 11,
      "tag_category_text": "paper-cp",
      "tag_name": "paper-cp_root",
      "childTags": [
        {
          "tag_id": 3227,
          "tag_level": 1,
          "tag_category": 11,
          "tag_category_text": "paper-cp",
          "tag_name": "标题",
          "childTags": [
            {
              "tag_id": 3242,
              "tag_level": 0,
              "tag_category": 11,
              "tag_category_text": "paper-cp",
              "tag_name": "基础标题"
            },
            {
              "tag_id": 31743,
              "tag_level": 0,
              "tag_category": 11,
              "tag_category_text": "paper-cp",
              "tag_name": "极简标题"
            },
            {
              "tag_id": 708,
              "tag_level": 0,
              "tag_category": 11,
              "tag_category_text": "paper-cp",
              "tag_name": "框线标题"
            },
            {
              "tag_id": 739,
              "tag_level": 0,
              "tag_category": 11,
              "tag_category_text": "paper-cp",
              "tag_name": "图片标题"
            },
            {
              "tag_id": 2443,
              "tag_level": 0,
              "tag_category": 11,
              "tag_category_text": "paper-cp",
              "tag_name": "底色标题"
            },
            {
              "tag_id": 2050,
              "tag_level": 0,
   
```

</details>

## 模块 `upload`

上传凭证（普通上传）

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/upload/token` | 🟡 已探测（只读 GET） | team_id, upload_type |

## 模块 `upload-cdn`

上传凭证（COS/CDN 直传）

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/api/upload-cdn/image/file` | ⚪ 仅静态（bundle 提取） | formData |
| `POST` | `/api/upload-cdn/token` | ⚪ 仅静态（bundle 提取） | — |

## 模块 `user`

账号资料、密码、手机/邮箱绑定、黑名单、米点、邀请

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `POST` | `/api/user/avatar/clear` | ⚪ 仅静态（bundle 提取） | — |
| `GET` | `/api/user/blacklist` | ✅ 已实测（真实流量） | — |
| `POST` | `/api/user/frozen` | ⚪ 仅静态（bundle 提取） | — |
| `GET / POST` | `/api/user/identity` | ✅ 已实测（真实流量） | — |
| `GET` | `/api/user/info` | ✅ 已实测（真实流量） | include, include(query) |
| `PUT` | `/api/user/info/avatar` | ⚪ 仅静态（bundle 提取） | avatar_url |
| `PUT` | `/api/user/info/bind-phone` | ⚪ 仅静态（bundle 提取） | — |
| `GET` | `/api/user/info/coin` | ✅ 已实测（真实流量） | — |
| `DELETE / PUT` | `/api/user/info/email` | ⚪ 仅静态（bundle 提取） | code, email |
| `POST` | `/api/user/info/extendlifebycoin` | ⚪ 仅静态（bundle 提取） | coin |
| `GET` | `/api/user/info/invitation` | ✅ 已实测（真实流量） | — |
| `PUT` | `/api/user/info/nickname` | ⚪ 仅静态（bundle 提取） | nickname |
| `PUT` | `/api/user/info/phone` | ⚪ 仅静态（bundle 提取） | area_code, clear_email, code, phone |
| `POST` | `/api/user/info/transfercoin` | ⚪ 仅静态（bundle 提取） | area_code, transfer_count, transfer_email |
| `POST` | `/api/user/info/upgradebycoin` | ⚪ 仅静态（bundle 提取） | — |
| `PUT` | `/api/user/password` | ⚪ 仅静态（bundle 提取） | email, password |
| `DELETE / GET / POST` | `/api/user/reset-phone` | ✅ 已实测（真实流量） | — |
| `GET` | `/api/user/template_membership` | ✅ 已实测（真实流量） | — |
| `GET` | `/api/user/template_membership_state` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/user/traffic_package_info` | ✅ 已实测（真实流量） | — |
| `GET` | `/api/user/traffic_package_list/for` | 🟡 已探测（只读 GET） | limit |
| `POST` | `/api/user/unbind_apple` | ⚪ 仅静态（bundle 提取） | force |
| `POST` | `/api/user/unbind_qq` | ⚪ 仅静态（bundle 提取） | force |
| `POST` | `/api/user/unbind_wechat` | ⚪ 仅静态（bundle 提取） | force |
| `POST` | `/api/user/unbind_weibo` | ⚪ 仅静态（bundle 提取） | force |

<details>
<summary>响应样本（8 条）</summary>

**`GET /api/user/blacklist`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {}
}
```

**`GET /api/user/identity`**

```json
{
  "code": 0,
  "message": "Common:OK"
}
```

**`GET /api/user/info`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "requirePhoneBind": true,
    "user": {
      "user_sid": "l0TvI",
      "unique_uid": "0123456789abcdef0123456789abcdef",
      "nickname": "示例用户8295",
      "avatar_url": null,
      "brand_name": null,
      "level": 1,
      "sub_account": 0,
      "userpage_url": "https://v.xiumius.cn/u/l0TvI",
      "location": "示例地区",
      "hasPassword": true,
      "agreement_access": 1,
      "area_code": 86,
      "phone": "13800000000",
      "email": null,
      "isBindQQ": true,
      "isBindWeibo": false,
      "isBindWx": false,
      "isBindApple": false,
      "qq_qd_uin": null,
      "partner_uid": null,
      "level_remain_life": 0,
      "levelLimit": {
        "version": 1,
        "fragmentLimit": 100,
        "showLimit": 30,
        "showPageLimit": 300,
        "articleLimit": 30,
        "articlePageLimit": 1000,
        "upImageNumLimit": 100,
        "upImageSizeLimit": 10485760,
        "upAudioNumLimit": 10,
        "upAudioSizeLimit": 10485760,
        "upVideoNumLimit": 10,
        "upVideoSizeLimit": 20971520,
        "teamCountLimit": 1,
        "teamMemCountLimit": 10,
        "formDataCountLimit": 100
      },
      "created_at": "2026-09-20T10:29:26.000Z",
      "user_setting": {},
      "message_count": {
        "total": 0,
        "unread": 0
      }
    },
    "authPhoneNeed": 0
  }
}
```

**`GET /api/user/info/coin`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "coinCount": 0
  }
}
```

**`GET /api/user/info/invitation`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "allowInvitation": true,
    "invitedCount": 0,
    "invitationLink": "https://xiumi.us/user/invitation/14GE8-8eGwL"
  }
}
```

**`DELETE /api/user/reset-phone`**

```json
{
  "code": 0,
  "message": "Common:OK"
}
```

**`GET /api/user/template_membership`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "days": 0,
    "is_member": false
  }
}
```

**`GET /api/user/traffic_package_info`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "traffic": 0,
    "hasPackage": false
  }
}
```

</details>

## 模块 `user_home`

个人主页：关注/粉丝、标签、投稿展位、售卖统计

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/user_home` | 🟡 已探测（只读 GET） | — |
| `GET / POST` | `/api/user_home/follow` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/user_home/followers` | 🟡 已探测（只读 GET） | limit, page |
| `PUT` | `/api/user_home/my/info` | ⚪ 仅静态（bundle 提取） | desc, name |
| `DELETE / POST` | `/api/user_home/my/published/exhibits` | ⚪ 仅静态（bundle 提取） | show_id |
| `POST` | `/api/user_home/my/published/exhibits/orders` | ⚪ 仅静态（bundle 提取） | — |
| `GET` | `/api/user_home/published/user` | 🟡 已探测（只读 GET） | limit, page |
| `GET` | `/api/user_home/published/user/{hash}/exhibits/on_mypage` | ✅ 已实测（真实流量） | limit(query), page(query) |
| `GET` | `/api/user_home/published/user/{hash}/info` | ✅ 已实测（真实流量） | — |
| `GET` | `/api/user_home/sold/user` | 🟡 已探测（只读 GET） | access_token, end_date, limit, page_height, page_width, start_date |
| `GET` | `/api/user_home/tag` | 🟡 已探测（只读 GET） | — |
| `POST` | `/api/user_home/tag/add` | ⚪ 仅静态（bundle 提取） | published_shows_id, tag |
| `POST` | `/api/user_home/tag/clear/{param}` | ⚪ 仅静态（bundle 提取） | — |
| `GET / POST` | `/api/user_home/tag/order` | ✅ 已实测（真实流量） | order |
| `DELETE` | `/api/user_home/tag/remove/{param}/{param2}` | ⚪ 仅静态（bundle 提取） | — |
| `DELETE` | `/api/user_home/tag/rename` | ⚪ 仅静态（bundle 提取） | new_tag, old_tag |
| `DELETE` | `/api/user_home/tag/shows/{show_id}/{show_id2}` | ⚪ 仅静态（bundle 提取） | limit, page |
| `GET` | `/api/user_home/tag/tagorder/{hash}` | ✅ 已实测（真实流量） | — |
| `GET` | `/api/user_home/tag/tagorder/{param}` | ⚪ 仅静态（bundle 提取） | — |
| `GET` | `/api/user_home/tag/tags/{tag_id}/{tag_id2}` | ⚪ 仅静态（bundle 提取） | — |

<details>
<summary>响应样本（4 条）</summary>

**`GET /api/user_home/published/user/{hash}/exhibits/on_mypage`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "count": 0,
    "exhibits": []
  }
}
```

**`GET /api/user_home/published/user/{hash}/info`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "user_sid": "l0TvI",
    "unique_uid": "0123456789abcdef0123456789abcdef",
    "nickname": "示例用户8295",
    "avatar_url": null,
    "brand_name": null,
    "level": 1,
    "sub_account": 0,
    "userpage_url": "https://v.xiumius.cn/u/l0TvI",
    "location": "示例地区"
  }
}
```

**`GET /api/user_home/tag/order`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": "Added"
}
```

**`GET /api/user_home/tag/tagorder/{hash}`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "tags": [],
    "tagsOrder": null
  }
}
```

</details>

## 模块 `user_setting`

个人主页外观设置（背景、配色、水印、接收类型）

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET / POST` | `/api/user_setting` | 🟡 已探测（只读 GET） | settings |
| `POST` | `/api/user_setting/background` | ⚪ 仅静态（bundle 提取） | background |
| `GET / POST` | `/api/user_setting/palette` | 🟡 已探测（只读 GET） | team_id, user_id |
| `POST` | `/api/user_setting/show-receive-type` | ⚪ 仅静态（bundle 提取） | showReceiveType |
| `GET / POST` | `/api/user_setting/watermark` | 🟡 已探测（只读 GET） | team_id |
| `GET` | `/api/user_setting/watermark-all` | 🟡 已探测（只读 GET） | — |

## 模块 `wallet`

钱包：余额、米点账单、团队钱包

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `GET` | `/api/wallet/bills` | ✅ 已实测（真实流量） | limit, page, limit(query), page(query) |
| `GET` | `/api/wallet/my/balance` | ✅ 已实测（真实流量） | — |
| `GET` | `/api/wallet/team_balance` | 🟡 已探测（只读 GET） | limit |
| `GET` | `/api/wallet/team/balance` | 🟡 已探测（只读 GET） | — |
| `GET` | `/api/wallet/team/bills` | 🟡 已探测（只读 GET） | limit, page |

<details>
<summary>响应样本（2 条）</summary>

**`GET /api/wallet/bills`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "count": 0,
    "walletBills": []
  }
}
```

**`GET /api/wallet/my/balance`**

```json
{
  "code": 0,
  "message": "Common:OK",
  "data": {
    "wallet": 0,
    "debt": 0
  }
}
```

</details>

## 模块 `wechat`

其它/未归类

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `?` | `/auth/wechat` | 🟡 已探测（只读 GET） | — |

## 模块 `weibo`

其它/未归类

| 方法 | 路径 | 验证 | 参数 |
|---|---|---|---|
| `?` | `/auth/weibo` | 🟡 已探测（只读 GET） | — |

