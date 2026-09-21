# 写操作验证：机制与闭环说明

> **数字看 [`COVERAGE.md`](./COVERAGE.md)。** 那份逐方法台账由
> `node scripts/coverage.mjs` 从 `data/verification.json` 生成，而 `verification.json`
> 只能由验证脚本回写 —— 也就是说「验过没有」这件事不再由人记。
>
> 本文只讲**怎么验的、踩到哪些机制坑**，是那份台账的说明文，不是另一份结论。
>
> 跑法：
> ```bash
> node scripts/verify_matrix.mjs   # 作品写链路：建 → 改 → 回读 → 删 → 回收站 → 恢复
> node scripts/verify_ops.mjs      # 只读面 + 素材/标签/偏好设置/消息（可逆、零副作用）
> node scripts/coverage.mjs        # 重新生成 COVERAGE.md 与 data/coverage.json
> ```

## 验证纪律（三轮下来沉淀的）

1. **写操作必须带回读断言**。`PUT` 返回 `code=2 Updated` 只说明请求被受理，
   改了没有要看回读。「改完再 `GET` 一次，断言字段真的变了」才算通过。
2. **一个方法一条记录**，不合并。这样 `verification.json` 里的状态可以直接翻译成
   「这个方法敢不敢用」。
3. **做不到可逆的宁可记 ⛔ 也不测**。账号没有团队版、没有消息、要真实资金、
   或改动不可还原（如把第三方邮箱写进评论白名单后留在黑名单里），一律记「环境受限」
   并写清原因 —— 假阴性比没数据更糟。
4. **只读方法的通过标准是「路由 + 鉴权 + 参数形状都通、拿到了值」**，
   返回值形状写进备注。404 / 400 一律记 ❌，那才是有价值的信号。
5. **构建新对象再删掉**：一次性作品/素材都在自己的账号里，用完即删并确认消失。


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

## 写接口里「已验证 / 待确认 / 环境受限」的三分

逐方法明细在 [`COVERAGE.md`](./COVERAGE.md)。这里只留结论性的几类：

| 类别 | 状态 | 说明 |
|---|---|---|
| 作品写链路（建/改/标签/开关/拷贝/删/回收站/恢复/改名） | ✅ | 回读断言齐全，见 `verify_matrix.mjs` |
| 素材库（外链收录 / 打标签 / 改标签名 / 删标签 / 删素材 / base64 上传） | ✅ | 建自己的素材再删，见 `verify_ops.mjs` |
| 偏好设置（作品接收类型 / 背景 / 水印） | ✅ | 写当前值或写「无」，随后回读 userSetting 出现对应键 |
| 消息静音三开关 | ✅ | 0→1 回读、1→0 回读，全可逆 |
| 纯校验类（HTML 代码校验） | ✅ | 无状态 |
| `setPalette` | ❌ | 路径存在但 body 契约未解：服务端报 `"undefined" is not valid JSON` |
| `updateUserSetting` | ❌ | `POST /api/user_setting` 实测 404（试过 5 种路径变体） |
| `addFragmentTag` | ❌ | 创建碎片标签的入口没找到（`paper/tags` → Failed_NotFound，补 category → 404） |
| 团队 / 商城交易 / 微信绑定 / 评论白名单 / 关注他人 | ⛔ | 账号能力或边界所限，见 COVERAGE 的「环境受限」清单与原因 |

## 复现方式

```bash
cd <repo>
node scripts/verify_matrix.mjs         # 作品写链路（会自建自删一次性作品）
node scripts/verify_ops.mjs            # 只读面 + 可逆写面（会自建自删一次性素材）
node scripts/coverage.mjs              # 由 data/verification.json 生成 COVERAGE.md
node scripts/e2e_roundtrip.mjs         # 指定作品的读写往返
node scripts/probe_write.mjs <id>      # 单作品的写链路隔离排查
node scripts/probe_trash.mjs           # 删除/回收站语义
node scripts/probe_recover.mjs         # 恢复用哪个 id
```

> 探针脚本（`scripts/probes/`）是**取证**用的，只打印不结论；结论一律进
> `data/verification.json`，再由 `coverage.mjs` 渲染。两者不要混。
