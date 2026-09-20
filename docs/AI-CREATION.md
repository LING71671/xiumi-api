# AI 内容创作能力清单

回答两个问题：**创作用的接口齐了吗？能不能让 AI 直接在这个平台上创作？**

结论：**能，而且是端到端验证过的** —— 包括「不克隆任何已有作品、从零拼一份图文并让编辑器正确渲染出文字和图片」。

---

## 能力矩阵

| 能力 | 接口 | 状态 | 证据 |
|---|---|---|---|
| 账密登录（纯 HTTP） | `POST /auth/email/login` | ✅ 已实测 | 302 + `Set-Cookie: sid` |
| 新建空白作品 | `POST /api/shows/v5/{type}` | ✅ 已实测 | 返回 `show_id` |
| **从零构造页面**（不克隆） | 客户端 `buildShow()` + 站内空模板 | ✅ 已实测 | `show_id 727019992 / 727023062` |
| **写入正文文本** | `PUT /api/shows/{id}`，改 `txt1.text` | ✅ 已实测渲染 | 编辑器页渲染出新文本 |
| **插入图片** | 上传 + 官方 `matrix` 组件 | ✅ 已实测渲染 | 编辑器发出 `GET img.xiumi.us/...-sz_70.png` → 200 |
| 上传图片（≤ 小图） | `POST /api/assets/image/data` | ✅ 已实测 | 返回 `target_uri` |
| 追加页面 | `PUT /api/shows/{id}` + 空页模板 | ✅ 已实测 | 页数 1→2→3 |
| 插入官方组件/模板 | `GET /api/templates/items` → `matrix` | ✅ 已实测 | 21640 条组件库 |
| 拷贝整篇作品 | `POST /api/shows/v5/{type}?from_show_id=` | ✅ 已实测 | 生成新 `show_id` |
| 打标签整理 | `POST /api/shows/{id}/tags` | ✅ 已实测 | 写后列表可见 |
| 删除 / 恢复 | `DELETE` + `POST /api/shows/recover/{deleted_show_id}` | ✅ 已实测 | 回收站闭环 |
| 大图走 COS 直传 | `/api/upload-cdn/token` + `cosobj` | ⚠️ 未实测 | 需要 COS 签名实现 |
| 从公众号文章导入 | `/api/shows/importwxarticle` | ⚠️ 未实测 | 需可访问的文章链接 |
| 申请发布 / 过审 | `POST /api/shows/{id}/release/application` | ⚠️ 未实测 | 免费版无此权限 |
| 渲染导出 PDF/图 | `/api/renderer/*` | ⚠️ 未实测 | 依赖渲染队列 |
| 视频 / 音频组件 | `paper-cp:video/video-xm` 等 | ⚠️ 未实测 | 模板库里有，未构造验证 |

---

## 核心约束：**组件必须来自站内，不能手写**

这是这套接口最重要的性质。实测对比：

| 做法 | 结果 |
|---|---|
| 手写 `tplId: "paper-cp:img/1-img-normal"`（凭想象） | 服务端**接受**（200），但编辑器把图片渲染成**占位图** —— 静默降级，不报错 |
| 用官方库的 atom_tpl_id `"paper-cp:image/001-img-center"` 取 matrix | 正常渲染，编辑器真实加载图片 |

⚠️ 注意区分两个 id：

- `atom_tpl_id` = `paper-cp:image/001-img-center` —— **用它去 `GET /api/templates/items` 请求 matrix**
- `matrix._comp.tplId` = `paper-cp:image/img-autowidth` —— 这是**实例化后**的 id，落库时原样保留，但**不能拿它当 atom_tpl_id 去请求**（会 miss）

所以：

- **改内容**（`txt1.text`、`img1.src`）→ 随便改，安全。
- **加新组件** → 必须从 `GET /api/templates/items` 拿 `matrix`，不要手写 tplId。

### 为什么 `_$raHTML` 可以不管

站内数据里每个图层带一个 `_$raHTML`（预渲染 HTML 缓存），模板库里对应
`renderer_accelerate` 字段。**实测：不带 `_$raHTML` 也能正确渲染** ——
渲染器发现缓存缺失/失效时会从 JSON 重建。带上是省一点渲染开销，不是必需。

（早期的图片占位问题**不是** `_$raHTML` 缺失造成的，是 tplId 不存在。）

---

## 给 AI 的创作流程（已验证）

```js
import { Xiumi } from '../client/xiumi.mjs';

const api = await Xiumi.loadSession('./session.json');   // 或 Xiumi.login({user, password})

// ① 需要图片时先上传，拿到 target_uri
const up = await api.uploadImageBase64(pngBuffer, 'cover.png');
// → { target_uri: '//img.xiumi.us/xmi/ua/.../xxx-sz_70.png', display_name }
//   注意：base64 必须带 data:image/png;base64, 前缀（客户端已默认加）

// ② 要插组件就从官方库取（不要手写 tplId）
const textComp = await api.templateComp('paper-cp:header/1-txt-normal', (c) => {
  c.txt1.text = '<p style="text-align:center"><strong>标题</strong></p><p>正文……</p>';
});
const imgComp = await api.templateComp('paper-cp:image/001-img-center', (c) => {
  c.img1.src = up.target_uri;
});
const lineComp = await api.templateComp('paper-cp:basic/split-line');

// ③ 从零搭骨架
const show = api.buildShow('paper', 'AI 生成的图文');
show.cubes[0].pages[0].layers[0].comps.items.push(textComp, lineComp, imgComp);

// ④ 需要多页就追加（会自动配一份背景层）
api.appendPage(show, { texts: ['<p>第二页</p>'] });

// ⑤ 保存
const created = await api.createShow('paper', show);
console.log('编辑器:', 'https://xiumi.us' + created.edit_url);
```

改已有作品时：`readShowData(meta, {editing:true})` → 改 → `updateShow(meta, data)`。

---

## 组件库怎么找

```js
// 按标签树浏览
const tree = await api.templateTagsTree();
// [{ tag_id:1, tag_name:'paper-cp_root', childTags:[{ tag_name:'标题', childTags:[...] }] }]

// 按分类 + 关键词检索（21640 条）
const r = await api.listTemplates({ tagCategory: 'paper-cp', q: '图片', limit: 20, page: 0 });
// → { count, templates: [{ atom_tpl_id, display_name, matrix, renderer_accelerate, thumb_uri, tags }] }

// 一次取多个组件的完整 matrix
const items = await api.templateItems([
  'paper-cp:header/1-txt-normal',
  'paper-cp:image/001-img-center',
  'paper-cp:basic/split-line',
]);
```

实测有效的 `atom_tpl_id` 样例：

| atom_tpl_id | 说明 |
|---|---|
| `paper-cp:header/1-txt-normal` | 正文文字 |
| `paper-cp:basic/h1` … `h5` | 各级标题 |
| `paper-cp:basic/ul-2` / `ol-1` / `ol-2` / `ol-3` | 列表 |
| `paper-cp:basic/quot` | 引用 |
| `paper-cp:basic/split-line` | 分割线 |
| `paper-cp:image/001-img-center` | 居中对齐图片 |
| `paper-cp:video/video-xm` | 秀米视频 |
| `paper-cp:layout/row1-r1c1` / `r1c2` / `r1c3` | 单行布局（1/2/3 列） |
| `paper-cp:layout/horizontal` / `vertical` / `carousel` / `overlap` | 布局容器 |
| `paper-cp:layout/free-canvas` / `flow-canvas` | 画布 |
| `booklet-cp:baseware/txt-only-bg` / `cimg-only` | 册子基础页 |

---

## 站内空模板（`buildShow` 的内部）

来自编辑器 `depot/services/showDataGenerator`：

| 类型 | cube tplId | page tplId | layer tplId | scene |
|---|---|---|---|---|
| `paper`（图文） | `paper-cp:sys/cube-fs` | `paper-cp:sys/pg-flw` | `paper-cp:sys/ly-flw` | `flw.vertical.one-page` |
| `booklet`（册子） | `booklet-cp:sys/cube-fs` | `booklet-cp:sys/pg-fs` | `booklet-cp:sys/ly-fs` | `fs.vertical.paging` |
| `tablet`（长图） | `tablet-cp:sys/cube-fs` | `tablet-cp:sys/pg-flw` | `tablet-cp:sys/ly-flw` | `flw.vertical.one-page` |
| `placard`（海报） | `placard-cp:sys/cube-fs` | `placard-cp:sys/pg-fs` | `placard-cp:sys/ly-fs` | `fs.vertical.paging` |

背景层（ground）：图文**自己没定义** `emptyGround`，站内统一拿
`booklet-cp:sys/pg-fs` 当背景层、把 `constraint.role` 改成 `"ground"`。
`pages` 与 `grounds` 是**平行数组**，追加页面必须同步追加背景层。

---

## 还没打通的

| 缺口 | 影响 | 建议路径 |
|---|---|---|
| 视频 / 音频 / SVG 组件 | 无法生成含音视频的图文 | 有 `matrix` 可拿，照图片的路子试一次即可 |
| 大图 COS 直传 | 上传超过 base64 限制的图 | 实现 `signCos`（bundle 里有 `SecretId/SecretKey/Method/key` 签名逻辑） |
| 微信文章导入 | 无法一键搬运公众号内容 | 需真实文章链接 |
| 发布 / 过审 | 生成的作品只能自己看，公开页 403 | `submitReleaseApplication`，或升级账号 |
| 导出 PDF / 截图 | 无法直接出成品文件 | `/api/renderer/*`，依赖队列 |
| 我的图库列表为空 | 上传的图 `target_uri` 可用，但 `GET /api/assets/list/image` 返回 `[]` | 图库面板可能另有过滤条件；不影响创作 |

---

## 一句话回答

**创作用的接口已经够用了**：登录 → 上传图 → 从官方组件库取组件 → 从零拼页面
→ 保存 → 编辑器正确渲染，全链路实测通过。

**AI 可以在这上面创作**，前提是遵守一条约束：**组件结构只能来自站内模板库**
（`GET /api/templates/items` 的 `matrix`），不要凭想象手写 `tplId` ——
写错不会报错，只会静默渲染成占位图。
