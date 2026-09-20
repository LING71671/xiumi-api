# 内容创作实操配方（Recipes）

全部配方均已在本仓库实测。可直接复制运行。

```js
import { Xiumi } from '../client/xiumi.mjs';
```

---

## 0. 会话：拿到登录态

```js
// 账密登录（纯 HTTP，不需要浏览器）
const api = await Xiumi.login({ user: '138****0000', password: '...' });
await api.saveSession('./session.json');      // sid 有效 3 天，多活

// 之后复用
const api = await Xiumi.loadSession('./session.json');
```

**若登录失败**，先查是不是触发了验证码：

```js
if (await api.needCaptcha('138****0000')) {
  // true → 本次必须过腾讯防水墙 TCaptcha(appid 2046835682)，纯 HTTP 走不通
  // 要么等一会儿重试，要么用 Playwright 过验证码（scripts/login.mjs）
}
```

⚠️ **绝对不要**用 `GET /auth/logout` 做"探测"——它是 GET 但会真的登出你自己。
`scripts/api_probe.mjs` 里有一份危险端点黑名单，抄它。

---

## 1. 读：作品元信息 / 内容

```js
// 列表
const list = await api.listShows({ type: 'paper', limit: 20, offset: 0 });
const shows = list.shows ?? list;             // 兼容两种返回形状

// 元信息（含 saved_at / show_data_url / editing_show_data_url / show_url / edit_url）
const meta = await api.getShow(727015965);

// 内容：发布态（无需登录态，走 CDN）
const { data: published } = await api.readShowData(meta);

// 内容：草稿态（要 sid；编辑器二次打开时读的是这个）
const { data: draft } = await api.readShowData(meta, { editing: true });
```

**两个内容地址别读错：**

| 地址 | 来源字段 | 鉴权 | 返回 |
|---|---|---|---|
| `//sd.xiumius.cn/xmi/pd/<...>.json` | `show_data_url` | 无 | envelope？**否，裸 JSON** |
| `/api/shows/{id}/data/editing?path=...` | `editing_show_data_url` | 需 `sid` | 裸 JSON |

用 `api.fetchJson(url)` 读，它会自动判断有没有 envelope。

---

## 2. 作品数据结构

```
show
├─ version            "2.0"
├─ title / desc / cover
├─ scene              "flw.vertical.one-page"（图文） | "fs.vertical.paging"（册子/长图）
├─ viewport           { STAGE_SIZE:"flow_scroll", WIDTH:415, FONT_SIZE:16 }
├─ targetContext      "wechat"
├─ actingType         "paper" / "booklet" / ...
├─ autoSlideInterval  0
├─ cubes[]            ← 真正的内容
│   └─ [0] { _comp, pages[], grounds[], overlaps[] }
│       ├─ pages[i]   { _comp, layers[] }
│       │   └─ [j]    { _comp:{tplId,constraint,pose,style,_$uuid,_$raHTML},
│       │               comps:{ type:"group", constraint:{childLayout:"static"},
│       │                        items:[ comp, ... ] },
│       │               _qiBlock:{ type:"group", constraint:{...}, items:[] } }
│       └─ grounds[i] 与 pages 一一对应的背景层
├─ popups / backgroundMusic / authorAppendix / $appendix / wx_author / wx_link
└─ displaySystemTitle / displaySystemPageMargins / displaySystemCatalogue
```

**一个文本组件的真实样子**（去掉 `_$raHTML` 长串后）：

```json
{
  "_comp": {
    "tplId": "paper-cp:header/1-txt-normal",
    "constraint": { "opMenu": { "text-merged": true }, "pose": { "resize": "h" } },
    "pose": { "position": "static", "width": null, "height": null },
    "style": {},
    "_$uuid": "comp-qY0SWUf67IeyRKe5"
  },
  "txt1": {
    "type": "text",
    "text": "<p>标题</p><p>正文</p>",
    "style": { "textAlign": "justify" },
    "constraint": {}
  }
}
```

> `_$raHTML` 是渲染加速用的预渲染 HTML 缓存。
> **实测：只改 `txt1.text`、不动 `_$raHTML`，编辑器与发布态都会渲染出新文本。**

---

## 3. 配方：新建空白作品

```js
const s = await api.createBlankShow('paper', '我的新图文');
console.log(s.show_id, s.show_url, s.edit_url);
```

返回体里 `show_url`（公开页）与 `edit_url`（编辑器页）都是**相对路径**，用时要补 `https://xiumi.us`：

```js
const editUrl = 'https://xiumi.us' + s.edit_url;   // /studio/v5#/paper/for/{id}
```

---

## 4. 配方：改标题 / 追加页面（可逆，已验证）

```js
const meta = await api.getShow(show_id);
const { data } = await api.readShowData(meta, { editing: true });

// 改标题
data.title = '新标题';

// 追加一页：克隆最后一页（pages 与 grounds 是平行数组，必须同步 push）
const pages = data.cubes[0].pages;
const grounds = data.cubes[0].grounds;
pages.push(structuredClone(pages[pages.length - 1]));
grounds.push(structuredClone(grounds[grounds.length - 1] ?? {}));

await api.updateShow(meta, data);      // 乐观锁失败会自动重试一次
```

`PUT` 成功后回读元信息，`saved_at` 会变，就是保存成功的标志。

---

## 5. 配方：改正文文本（内容创作核心，已验证渲染）

```js
const meta = await api.getShow(show_id);
const { data } = await api.readShowData(meta, { editing: true });

// 定位到某个组件
const comp = data.cubes[0].pages[0].layers[0].comps.items[0];
comp.txt1.text = '<p>由 API 写入的正文</p><p>第二段</p>';
//   ↑ 不要动 comp._comp._$raHTML

await api.updateShow(meta, data);
```

**遍历全部文本组件的辅助函数：**

```js
function* walkComps(node, path = '') {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) yield* walkComps(node[i], `${path}[${i}]`); return; }
  if (node._comp?.tplId) yield { path, node };
  if (node.items) yield* walkComps(node.items, `${path}.items`);
  if (node.comps) yield* walkComps(node.comps, `${path}.comps`);
}
// 用法
for (const { path, node } of walkComps(data.cubes[0].pages[0].layers[0])) {
  if (node.txt1?.text) console.log(path, node._comp.tplId, node.txt1.text.slice(0, 60));
}
```

---

## 6. 配方：从已有作品派生新品（最稳的创作路径）

一次调用拿到新作品（内容原样复制）：

```js
const srcMeta = await api.getShow(源作品id);
const { data: srcData } = await api.readShowData(srcMeta, { editing: true });

const created = await api.createShow('paper', { ...srcData, title: '派生作品' });
```

如果只想拷标题、让服务端复制内容（更省流量）：

```js
const copy = await api.copyShow(srcMeta, null);       // 拷给自己
console.log(copy.show_id);
```

`copyShow` 内部会构造 `tn_show_action_token_2`（取 `show_data_name` 前两段路径，前后 16 字符对调），
客户端已按编辑器逻辑实现。

---

## 6b. 配方：从零创作（不克隆任何作品）— 已验证

**这是 AI 创作的主路径。** 关键约束：组件必须从**官方模板库**取，不要手写 `tplId`。

```js
// ① 上传图片（服务端要求 base64 带 data URI 前缀，客户端已默认加）
const up = await api.uploadImageBase64(pngBuffer, 'cover.png');
// → { target_uri: '//img.xiumi.us/xmi/ua/.../xxx-sz_70.png', display_name }

// ② 从官方模板库（21640 条）取组件
const t1 = await api.templateComp('paper-cp:header/1-txt-normal', (c) => {
  c.txt1.text = '<p style="text-align:center"><strong>标题</strong></p><p>正文……</p>';
});
const img = await api.templateComp('paper-cp:image/001-img-center', (c) => { c.img1.src = up.target_uri; });
const ln  = await api.templateComp('paper-cp:basic/split-line');

// ③ 从零搭骨架（站内空模板）
const show = api.buildShow('paper', 'AI 生成的图文');
show.cubes[0].pages[0].layers[0].comps.items.push(t1, ln, img);

// ④ 追加页面（自动配背景层）
api.appendPage(show, { texts: ['<p>第二页</p>'] });

// ⑤ 保存
const created = await api.createShow('paper', show);
console.log('编辑器：' + 'https://xiumi.us' + created.edit_url);
```

**为什么必须用 `templateComp`：**

| 做法 | 结果 |
|---|---|
| 手写一个不存在的 `tplId`（如 `paper-cp:img/1-img-normal`） | 服务端 200 接受，编辑器**静默渲染成占位图** |
| 用官方库的 atom_tpl_id `paper-cp:image/001-img-center` 取 matrix | 正常渲染，编辑器真实加载图片 |

不报错、只降级 —— 所以别猜 tplId。还要注意 `atom_tpl_id` 与 `matrix._comp.tplId`
不是一回事：后者是实例化 id（图片这个恰好是 `paper-cp:image/img-autowidth`），
拿它去当 atom_tpl_id 请求会 miss。

### 找组件

```js
const tree = await api.templateTagsTree();                                  // 标签树
const r = await api.listTemplates({ q: '图片', limit: 20, page: 0 });        // 关键词检索
const items = await api.templateItems([                                     // 批量取 matrix
  'paper-cp:header/1-txt-normal', 'paper-cp:image/001-img-center', 'paper-cp:basic/split-line',
]);
```

实测有效的 id：`paper-cp:header/1-txt-normal`（正文）、`paper-cp:basic/h1..h5`（标题）、
`paper-cp:basic/ul-2`/`ol-1..3`（列表）、`paper-cp:basic/quot`（引用）、
`paper-cp:basic/split-line`（分割线）、`paper-cp:image/001-img-center`（居中图）、
`paper-cp:video/video-xm`（视频）、`paper-cp:layout/row1-r1c1|r1c2|r1c3`（单行布局）、
`paper-cp:layout/horizontal|vertical|carousel|overlap`。

详见 `docs/AI-CREATION.md`。

---

## 7. 配方：从公众号文章导入

```js
// 先预览抓到的结构
const article = await api.wxArticleData('https://mp.weixin.qq.com/s/xxxx');

// 直接建成作品
const show = await api.importWxArticle('https://mp.weixin.qq.com/s/xxxx');
```

> 未端到端实测（需要一个可访问的公众号链接）。路径与 body 形状取自 bundle：
> `POST /api/shows/importwxarticle` / `POST /api/shows/getwxarticledata`，body `{articleurl}`。

---

## 8. 配方：上传图片进素材库

小图直接走 base64（无需 COS 签名）：

```js
import fs from 'node:fs/promises';
const buf = await fs.readFile('./cover.png');
const img = await api.uploadImageBase64(buf, 'cover.png');
console.log(img);
```

外链图收进库：

```js
await api.addImageOutlink('https://example.com/a.jpg', { team_id: null });
```

大文件走 COS 直传（三步）：

```js
const token = await api.uploadCdnToken({ upload_type: 'image' });
// 1. 用 token.SecretId/SecretKey 签名，PUT 到 COS，得到 object_name
// 2. await api.registerCosObject({ object_name, team_id: null, watermark: undefined });
```

> COS 直传部分未端到端实测（需要 COS 签名实现）。小图用 `uploadImageBase64` 已足够。

把图片放进作品里：往 `pages[i].layers` 追加一个 `<img>` 组件，`src` 用上传返回的图片地址。
→ **未实测**，建议改为"从已有作品里克隆带图页面再改 `src`"。

---

## 9. 配方：标签管理（已验证可逆）

```js
await api.addTag(show_id, '我的标签');
const tags = await api.listTags('all');
await api.renameTag('我的标签', '新标签名');
await api.removeTag(show_id, '新标签名');
await api.clearTag('新标签名');                  // 全局删掉这个标签
const inTag = await api.showsInTag('新标签名', { type: 'paper', limit: 20 });
const untagged = await api.showsUntag({ type: 'paper' });
```

⚠️ `addTag` 的 body 里 `tag` 值需要 `encodeURIComponent` —— 客户端已处理。

---

## 10. 配方：权限 / 分享开关

```js
await api.setRightAccessPrivilege(show_id, 0);   // right_access_privilege 数值位
await api.setWechatNoShare(show_id, 1);          // 1 = 屏蔽微信分享
await api.setTrafficPackageUsage(show_id, 1);    // 需要账号有流量包
await api.submitReleaseApplication(show_id);     // 申请发布审核
const pv = await api.previewUri(`/shows/${show_id}`);   // {uri, expireTime}
```

> `show_url` 在申请审核通过前访问会返回
> `Camus:Failed_ShowReleaseNotApplied`（403，提示需登录秀米点预览申请审核）。
> 免费账号的公开页因此不可匿名访问，但**编辑器预览页一直可看**。

---

## 11. 配方：删除 / 回收站 / 恢复（已验证闭环）

```js
// 删除（软删除，返回 "Deleted"）
await api.deleteShow(show_id);

// 看回收站 —— 注意字段名是 orig_show_id
const trash = await api.deletedShows({ limit: 50 });
// [{ deleted_show_id: 514242015, orig_show_id: 727019201, title: '...', created_at: '...' }]

// 恢复必须用 deleted_show_id！
const hit = trash.find((t) => Number(t.orig_show_id) === Number(show_id));
await api.recoverShow(hit.deleted_show_id);        // 返回 "Recovered"
```

**易错点：`deleted_show_id` 与 `orig_show_id` 是完全不同的数值空间，传错就 404。**

---

## 12. 配方：导出

```js
await api.renderScreenshot(show_id, { /* 参数见 docs/API-REFERENCE.md */ });
await api.renderPdf(show_id);
await api.renderGif(show_id);
await api.renderVideo(show_id);
await api.renderFrames(show_id);
```

> 未端到端实测（依赖渲染队列）。

---

## 13. 错误码对照

| message | code | 含义 | 处理 |
|---|---|---|---|
| `Common:OK` | 0 | 成功 | — |
| `Common:Created` | 1 | 已创建 | — |
| `Common:Updated` | 2 | 已更新 | — |
| `Common:Deleted` | 3 | 已删除 | — |
| `Camus:Failed_ShowSavedTimeNotMatch` | -255 | 乐观锁冲突：`lastSavedAt` 不等于当前 `saved_at` | 重新 `getShow` 拿新 `saved_at` 重试（客户端已自动做） |
| `Common:Failed_NotFound` | -4 | 资源不存在 / 传错 id（如用 `orig_show_id` 去 recover） | 核对 id |
| `Common:Failed_InvalidParam` | -2 | 参数错（如 fragments 的 category 传成 `paper_cp`，应为 `comp`） | 核对枚举值 |
| `Common:Failed_DataRejected` | -10 | 作品数据没通过校验（多半是手写的组件结构不合法） | 改成克隆已有组件再改字段 |
| `Camus:Failed_OutOfLimit` | — | 容量/配额满 | 清理或升级 |
| `Camus:Failed_ShowReleaseNotApplied` | — | 公开页未过审 | 调 `submitReleaseApplication` |
| `Desk:Failed_InvalidShowId` | — | 前端本地判空，id 为 0 或空 | 核对入参 |

---

## 14. 危险端点黑名单（探测时必须跳过）

| 方法 | 路径 | 后果 |
|---|---|---|
| GET | `/auth/logout` | 登出当前会话 |
| DELETE | `/api/shows/{id}` | 删除作品 |
| POST | `/api/shows/recover/{id}` | 恢复（本身无害，但依赖已删项） |
| POST | `/api/assets/clearimages` | 清空图库 |
| DELETE | `/api/assets/{id}` | 删素材 |
| POST | `/api/shows/send` | 把作品发给他人（**外发，绝不能在探测里调**） |
| POST | `/api/user/password` | 改密码 |
| POST | `/api/user/info/avatar` | 改头像 |
| POST | `/api/orders` | 下单（真实消费） |

写验证时只对**自己新建的一次性作品**做写操作，跑完删掉——`scripts/verify_matrix.mjs` 就是这么写的。
