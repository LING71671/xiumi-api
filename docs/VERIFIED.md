# 写操作验证报告（Verification Report）

> 生成方式：`node scripts/verify_matrix.mjs`
> 环境：账号 `138****0000`，秀米免费版（`levelLimit` 见 `/api/user/info`）
> 落盘：`data/verified.json`、`capture/_verify_matrix.log`

## 结论

**42 项全部通过。** 已打通「开机密登录 → 读元信息 → 读内容 → 改内容 → 保存 → 回读一致 →
拷贝 → 删除 → 回收站 → 恢复」的完整闭环，全部通过纯 HTTP（Node 内置 `fetch`）完成，不依赖浏览器。

```
总计 42  通过 42  失败 0
  auth       pass=4  fail=0
  wallet     pass=2  fail=0
  show       pass=2  fail=0
  asset      pass=1  fail=0
  template   pass=4  fail=0
  team       pass=1  fail=0
  msg        pass=1  fail=0
  order      pass=1  fail=0
  tag        pass=6  fail=0
  show-w     pass=12 fail=0   ← 写操作
  show-r     pass=7  fail=0   ← 作品读取
  show-w-na  pass=1  fail=0   ← 功能不可用（非接口缺陷）
```

## 逐项结果

| 分组 | 用例 | 方法 | 路径 | 结果 |
|---|---|---|---|---|
| auth | me | GET | `/auth/me` | 通过 |
| auth | userInfo | GET | `/api/user/info` | 通过 |
| auth | sysInfo | GET | `/api/sys_info` | 通过 |
| auth | apikey | GET | `/api/apikey` | 通过 |
| wallet | walletBalance | GET | `/api/wallet/my/balance` | 通过 |
| wallet | bills | GET | `/api/wallet/bills` | 通过 |
| show | listShows | GET | `/api/shows` | 通过 |
| show | showsCount | GET | `/api/shows/count` | 通过 |
| asset | listImages | GET | `/api/assets/list/image` | 通过 |
| template | listTemplates | GET | `/api/templates` | 通过 |
| template | fragmentTagDetails | GET | `/api/fragments/v5/paper/comp/tags` | 通过 |
| template | fragmentTagsOrder | GET | `/api/fragments/v5/paper/comp/tagsorder` | 通过 |
| template | usedFragmentsCount | GET | `/api/fragments/used/paper_cp` | 通过（返回 `{used:0,total:100}`） |
| team | teams | GET | `/api/teams` | 通过 |
| msg | messages | GET | `/api/messages` | 通过 |
| order | orders | GET | `/api/orders` | 通过 |
| tag | listTags | GET | `/api/shows/all/tags` | 通过 |
| **show-w** | createBlankShow | POST | `/api/shows/v5/paper` | 通过（返回 `show_id`），`code=1 Created` |
| **show-r** | getShow | GET | `/api/shows/{id}` | 通过（含 `saved_at` / `show_data_url` / `editing_show_data_url`） |
| **show-r** | readShowData(published) | GET | `show_data_url` | 通过（公开 CDN，无需登录态） |
| **show-r** | readShowData(editing) | GET | `editing_show_data_url` | 通过（需登录态，返回**裸 JSON**，非 envelope） |
| **show-w** | updateShow（改标题） | PUT | `/api/shows/{id}` | 通过，回读一致，`code=2 Updated` |
| **show-w** | updateShow（追加一页） | PUT | `/api/shows/{id}` | 通过，发布态页数 1 → 2 |
| tag | addTag | POST | `/api/shows/{id}/tags` | 通过，写后 `/api/shows/all/tags` 可见 |
| tag | renameTag | POST | `/api/shows/tags/rename` | 通过 |
| tag | removeTag | DELETE | `/api/shows/{id}/tags/{tag}` | 通过 |
| tag | clearTag | DELETE | `/api/shows/tags/clear/{tag}` | 通过 |
| **show-w** | setRightAccessPrivilege | PUT | `/api/shows/{id}/right_access_privilege/0` | 通过 |
| **show-w** | setWechatNoShare | PUT | `/api/shows/{id}/wechat_no_share/0` | 通过 |
| show-w-na | setTrafficPackageUsage | PUT | `/api/shows/{id}/use_traffic_package/0` | 接口存在；本账号无流量包，返回 `Failed_NotFound: package provider missing` |
| show-r | trafficPackageUsage | GET | `/api/shows/{id}/consumed/traffic_package/info` | 通过 |
| show-r | showHistories | GET | `/api/shows/{id}/histories` | 通过 |
| show-r | previewUri | GET | `/preview/uri` | 通过 |
| **show-w** | copyShow | POST | `/api/shows/v5/paper?from_show_id=` | 通过，生成新 `show_id` |
| **show-w** | deleteShow | DELETE | `/api/shows/{id}` | 通过，返回 `"Deleted"`，`code=3` |
| **show-r** | deletedShows | GET | `/api/shows/deleted/shows` | 通过，返回 `{count, deletedShows[]}` |
| **show-w** | recoverShow | POST | `/api/shows/recover/{deleted_show_id}` | 通过，返回 `"Recovered"`，恢复后可读 |

## 关键机制（实测确认）

### 1. 三套成功码，不止 `code=0`

统一响应体 `{code, message, data}` 的成功码：

| code | message | 场景 |
|---|---|---|
| 0 | `Common:OK` | 读取 / 通用成功 |
| 1 | `Common:Created` | 新建作品 |
| 2 | `Common:Updated` | 更新作品 |
| 3 | `Common:Deleted` | 删除作品 |

> 早期只把 0/1 当成功，导致 `PUT` 与 `DELETE` 明明成功却被判失败。已修为 `{0,1,2,3}`。

### 2. `PUT /api/shows/{id}` 有乐观锁

请求体为：

```json
{
  "format": "c444c492de13eb854a687b3361bef8c4",
  "encodedData": "<LZString.compressToBase64(JSON)>",
  "signature": "<md5(n$$uid$$r)>",
  "lastSavedAt": "<作品当前 saved_at>",
  "savingToken": "<md5(uuid + '.' + Date.now())>"
}
```

`lastSavedAt` 必须严格等于服务端当前的 `saved_at`，否则返回
`Camus:Failed_ShowSavedTimeNotMatch`（code `-255`，HTTP 400）。
客户端实现为：**遇到该错自动重新拉 `saved_at` 重试一次**。

### 3. 内容有两个版本，别读错

| 字段 | 位置 | 鉴权 | 内容 |
|---|---|---|---|
| `show_data_url` | `//sd.xiumius.cn/xmi/pd/...json` | 无需 | **发布态**（已保存的正式内容） |
| `editing_show_data_url` | `/api/shows/{id}/data/editing?path=...` | 需 `sid` | **草稿态**（编辑器当前内容） |

编辑器保存后两者内容一致；页面渲染读发布态，二次编辑读草稿态。

注意 `editing_show_data_url` **返回裸 JSON，不套 `{code,message,data}`**。
朴素地用"解 envelope 取 `.data`"的方式读会得到 `undefined`。

### 4. 删除是软删除，恢复要用 `deleted_show_id`

- `DELETE /api/shows/{id}` → `"Deleted"`，作品从列表消失，进回收站。
- `GET /api/shows/deleted/shows?limit&page` → `{count, deletedShows:[{deleted_show_id, orig_show_id, title, ...}]}`
- `POST /api/shows/recover/{deleted_show_id}` → `"Recovered"`

**恢复必须传回收站条目里的 `deleted_show_id`（如 `514242015`），传 `orig_show_id`（如 `727019201`）会 404。**
这两个 id 是完全不同的数值空间，非常容易搞混。

### 5. 账号能力边界（非接口缺陷）

| 能力 | 现象 | 说明 |
|---|---|---|
| 流量包 | `Failed_NotFound: package provider missing` | 免费版没有流量包服务 |
| 作品容量 | `Camus:Failed_OutOfLimit` | 回收站恢复时容量满会报此错（bundle 文案：图文/秀容量已满） |
| 卡片点数 | `/api/shows/{id}` 返回 `points: 50` | 每篇作品消耗点数 |

## 内容创作闭环（已用浏览器二次确认）

### 第一轮：克隆 + 改文本

`scripts/probe_textedit.mjs` + `scripts/probe_preview_render.mjs`：

| 步骤 | 动作 | 结果 |
|---|---|---|
| 1 | 读源作品草稿态内容 | 拿到完整 `cubes[0].pages[]` 结构 |
| 2 | `POST /api/shows/v5/paper` 克隆为新品 | `show_id=727019992` |
| 3 | 改 `comps.items[0].txt1.text`（**不动 `_$raHTML`**） | `code=2 Updated` |
| 4 | 回读草稿态 | 文本已变 |
| 5 | 回读发布态 | 文本已变 |
| 6 | **Playwright 打开编辑器页** | **渲染出 API 写入的文本** ✅ |

### 第二轮：从零构造（不克隆任何作品）

`scripts/probe_create_scratch.mjs` + `scripts/probe_official_comp.mjs`：

| 步骤 | 动作 | 结果 |
|---|---|---|
| 1 | `POST /api/assets/image/data` 上传 1x1 PNG | 返回 `target_uri`（**base64 必须带 data URI 前缀**） |
| 2 | `buildShow('paper')` 用站内空模板搭骨架 | cube/page/layer tplId 全部来自 `showDataGenerator` |
| 3 | `templateItems()` 取官方组件 `matrix` | 文本 / 图片 / 分割线 / 标题 |
| 4 | `POST /api/shows/v5/paper` 新建 | `show_id=727023062`，`code=1 Created` |
| 5 | 回读结构 | 4 个组件 tplId 与内容都正确落库 |
| 6 | **Playwright 打开编辑器页** | 文本渲染 ✅；**编辑器发出 `GET img.xiumi.us/.../xxx-sz_70.png` → 200，`naturalWidth=1`** ✅ |

关键结论：

- **可以从零创作，不依赖任何已有作品。**
- **`tplId` 必须来自站内**。手写一个不存在的 tplId（如 `paper-cp:img/1-img-normal`）
  服务端会 200 接受，但编辑器**静默渲染成占位图** —— 不报错、只降级。正确做法是用
  `GET /api/templates/items` 的 `matrix`（21640 条官方组件库）。
- **`_$raHTML`（模板库里的 `renderer_accelerate`）不是必需**：渲染器发现缓存缺失时
  会从 JSON 重建。第一轮的图片占位**不是**它造成的，是 tplId 写错了。
- **`pages` 与 `grounds` 是平行数组**，追加页面必须同步追加背景层。
  图文自己没定义 `emptyGround`，站内统一拿 `booklet-cp:sys/pg-fs` 当背景层、
  把 `constraint.role` 改成 `"ground"`。
- 公开页 `show_url` 在未过审时返回 `Camus:Failed_ShowReleaseNotApplied`（403），
  匿名访问不可用；编辑器/预览页带登录态始终可看。
- 返回的 `show_url` / `edit_url` / `previewUri` 都是**相对路径**，用时补 `https://xiumi.us`。

## 尚未端到端实测的写接口

以下接口已在 bundle 中定位到调用点与请求体形状，但未做端到端实测（多为账号无对应
功能、或需要真实交易/第三方凭证）：

| 分组 | 接口 | 阻塞原因 |
|---|---|---|
| 支付 | `/api/orders`、`/api/invoices`、`/api/wallet/*` 写路径 | 需要真实支付 |
| 团队 | `/api/teams/{id}` 成员/权限管理 | 当前账号无团队 |
| 素材 | `/api/upload-cdn/token` + COS 直传 + `/api/assets/image/cosobj` | 需走 COS 签名，未实测 |
| 发布 | `/api/shows/{id}/release/application` | 免费版无发布权限 |
| 渲染 | `/api/renderer/*` | 需渲染队列，未实测 |

## 复现方式

```bash
cd <repo>
node scripts/verify_matrix.mjs        # 42 项可逆写验证（会自建自删一次性作品）
node scripts/e2e_roundtrip.mjs        # 指定作品的读写往返
node scripts/probe_write.mjs <id>     # 单作品的写链路隔离排查
node scripts/probe_trash.mjs          # 删除/回收站语义
node scripts/probe_recover.mjs        # 恢复用哪个 id
```
