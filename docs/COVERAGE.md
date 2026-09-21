# 方法验证覆盖率

> 由 `node scripts/coverage.mjs` 生成 —— **数字与状态全部来自 `data/verification.json`**，
> 而那份文件只能由 `scripts/verify_matrix.mjs` / `scripts/verify_ops.mjs` 等验证脚本**回写**。
> 人不再手写「这个方法验过没有」。生成时间：2026-09-21T01:44:36.340Z；
> 最近一次验证：2026-09-21T01:32:19.613Z。

## 这一页在回答什么

「浏览器里能操作的，这里都能操作」这个标准下，真正的风险不是**接口有没有**，
而是**我敢不敢说它通了**。所以每个方法只有两种可信状态：

- 有**脚本跑出来的证据**（✅ / 🟡 / ❌ / ⛔）
- 没有证据（◻ / ❔）

源码 JSDoc 里的 `[未实测]` 是当初凭记忆写的**声明**，单独一列「风险标注」里列出，
**不参与**上面的状态判定。

## 状态含义

| 标记 | 含义 | 判据 |
|---|---|---|
| ✅ 实测通过 | 端到端跑通 | 写操作有**回读断言**（改完能读回预期变化）；只读操作路由+鉴权+参数形状都通 |
| 🟡 调用被接受 | 调用被接受 | 写请求返回成功，但该账号上读不出可观测差异（如只影响外观的偏好键） |
| ⚠️ 曾通过/本次失败 | 曾通过、本次失败 | 历史上有过通过记录，最近一次跑失败 |
| ❌ 实测未通过 | 实测未通过 | 脚本跑了，拿到 404 / 400 / 拒绝 —— **这是最有价值的一类**，见下面清单 |
| ⛔ 环境受限 | 环境受限 | 账号能力不具备（无团队版、无消息、无流量包、要真实资金）或不可逆。**不是方法的错** |
| ◻ 声明未实测 | 声明未实测 | 源码 JSDoc 写了 `[未实测]`，且没有任何脚本证据 |
| ❔ 无记录 | 无记录 | 既没声明也没跑过 |

## 总览

| 范围 | 合计 | ✅ 实测通过 | 🟡 调用被接受 | ⚠️ 曾通过/本次失败 | ❌ 实测未通过 | ⛔ 环境受限 | ◻ 声明未实测 | ❔ 无记录 |
|---|---|---|---|---|---|---|---|---|
| 全部 | 399 | 115 | 2 | 0 | 3 | 22 | 113 | 144 |
| 读 | 194 | 89 | 0 | 0 | 0 | 8 | 5 | 92 |
| 写 | 205 | 26 | 2 | 0 | 3 | 14 | 108 | 52 |

- **有脚本证据的**：142 / 399
  （其中 ✅115 🟡2 ❌3 ⛔22）
- **没有任何证据的**：257 / 399
  （其中源码声明过未实测的 ◻113，完全无记录的 ❔144）

## 待修：实测未通过（3）

这些不是「不敢说」，是**已知不对**。要么路径错、要么 body 契约错，
在修好之前不要用。

| 方法 | 类型 | 证据 | 错误 |
|---|---|---|---|
| `addFragmentTag` | 写 | `verify_ops.mjs` · 2026-09-21 01:32 | Common:Failed_NotFound |
| `updateUserSetting` | 写 | `verify_ops.mjs` · 2026-09-21 01:31 | HTTP 404 |
| `setPalette` | 写 | `verify_ops.mjs` · 2026-09-21 01:31 | Common:Failed: "undefined" is not valid JSON |

## 明细

### 读操作（194）

| 方法 | 类型 | 状态 | 风险标注 | 证据（脚本 · 用例 · 时间） | 说明 / 错误 |
|---|---|---|---|---|---|
| `adminTagDrop` | 读 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:18 | 管理端接口，普通账号 HTTP403 |
| `adminTagNew` | 读 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:18 | 管理端接口，普通账号 HTTP404 |
| `customDomains` | 读 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 团队版功能，无 team_id 时服务端直接 Failed_InvalidParam |
| `formData` | 读 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 需要表单型作品做载体；form 型作品无法由 /api/shows/v5/form 创建（InvalidParam），本轮造不出载体 |
| `goodsFavoriteTags` | 读 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 裸 GET 基址实测 404，真实入口都带 show_type 维度 |
| `invitation` | 读 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 需要邀请链接里的 salt_code（路径段） |
| `myGoodsInfo` | 读 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 需要 show_goods_id（商品 id 是路径段） |
| `myPurchasedState` | 读 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 需要 show_goods_id 参数 |
| `audioFile` | 读 | ◻ 声明未实测 | — | — | — |
| `extractHeadings2` | 读 | ◻ 声明未实测 | — | — | — |
| `headingTask` | 读 | ◻ 声明未实测 | — | — | — |
| `headingWord` | 读 | ◻ 声明未实测 | — | — | — |
| `psdFile` | 读 | ◻ 声明未实测 | — | — | — |
| `_me` | 读 | ❔ 无记录 | — | — | — |
| `appendPage` | 读 | ❔ 无记录 | — | — | — |
| `applications` | 读 | ❔ 无记录 | — | — | — |
| `audioList` | 读 | ❔ 无记录 | — | — | — |
| `authSuccess` | 读 | ❔ 无记录 | — | — | — |
| `bindUrl` | 读 | ❔ 无记录 | 账号凭据 | — | — |
| `buildShow` | 读 | ❔ 无记录 | — | — | — |
| `commentRights` | 读 | ❔ 无记录 | — | — | — |
| `comments` | 读 | ❔ 无记录 | — | — | — |
| `commentShareToken` | 读 | ❔ 无记录 | — | — | — |
| `connectAccessCode` | 读 | ❔ 无记录 | — | — | — |
| `customDomainsForShow` | 读 | ❔ 无记录 | — | — | — |
| `deletedShowsRaw` | 读 | ❔ 无记录 | 删除/清空 | — | — |
| `emailLoginSuccess` | 读 | ❔ 无记录 | 账号凭据 | — | — |
| `expectedIncome` | 读 | ❔ 无记录 | — | — | — |
| `fansCount` | 读 | ❔ 无记录 | — | — | — |
| `fetchJson` | 读 | ❔ 无记录 | — | — | — |
| `fontFaces` | 读 | ❔ 无记录 | — | — | — |
| `formCount` | 读 | ❔ 无记录 | — | — | — |
| `formsCount` | 读 | ❔ 无记录 | — | — | — |
| `get` | 读 | ❔ 无记录 | — | — | — |
| `getPublishedUser` | 读 | ❔ 无记录 | — | — | — |
| `getShowFull` | 读 | ❔ 无记录 | — | — | — |
| `goodsFavoriteTagItems` | 读 | ❔ 无记录 | — | — | — |
| `goodsFavoriteTagShows` | 读 | ❔ 无记录 | — | — | — |
| `invoice` | 读 | ❔ 无记录 | — | — | — |
| `invoices` | 读 | ❔ 无记录 | — | — | — |
| `invoicesAvailable` | 读 | ❔ 无记录 | — | — | — |
| `isGoodsFavorite` | 读 | ❔ 无记录 | — | — | — |
| `listFragments` | 读 | ❔ 无记录 | — | — | — |
| `listFragmentsByTag` | 读 | ❔ 无记录 | — | — | — |
| `loadSession` | 读 | ❔ 无记录 | — | — | — |
| `login` | 读 | ❔ 无记录 | — | — | — |
| `loginUrl` | 读 | ❔ 无记录 | — | — | — |
| `mobileWechatUrl` | 读 | ❔ 无记录 | — | — | — |
| `myApplications` | 读 | ❔ 无记录 | — | — | — |
| `myIncomes` | 读 | ❔ 无记录 | — | — | — |
| `myPurchased` | 读 | ❔ 无记录 | — | — | — |
| `needCaptcha` | 读 | ❔ 无记录 | — | — | — |
| `officialRecommended` | 读 | ❔ 无记录 | — | — | — |
| `officialShows` | 读 | ❔ 无记录 | — | — | — |
| `officialShowsLegacy` | 读 | ❔ 无记录 | — | — | — |
| `order` | 读 | ❔ 无记录 | — | — | — |
| `orderEnterpriseTeamLegacy` | 读 | ❔ 无记录 | — | — | — |
| `originalityUploadUrl` | 读 | ❔ 无记录 | — | — | — |
| `ownerPartnerApp` | 读 | ❔ 无记录 | — | — | — |
| `ownerPartnerAppDetail` | 读 | ❔ 无记录 | — | — | — |
| `partnerAppApplications` | 读 | ❔ 无记录 | — | — | — |
| `partnerAppBind` | 读 | ❔ 无记录 | — | — | — |
| `partnerAppBindList` | 读 | ❔ 无记录 | 账号凭据 | — | — |
| `partnerBind` | 读 | ❔ 无记录 | — | — | — |
| `partnerInfo` | 读 | ❔ 无记录 | — | — | — |
| `publishedUserBySid` | 读 | ❔ 无记录 | — | — | — |
| `publisherIdentity` | 读 | ❔ 无记录 | — | — | — |
| `qrProgress` | 读 | ❔ 无记录 | — | — | — |
| `renderComp` | 读 | ❔ 无记录 | — | — | — |
| `renderExport` | 读 | ❔ 无记录 | — | — | — |
| `renderFrames` | 读 | ❔ 无记录 | — | — | — |
| `renderGif` | 读 | ❔ 无记录 | — | — | — |
| `renderPdf` | 读 | ❔ 无记录 | — | — | — |
| `renderScreenshot` | 读 | ❔ 无记录 | — | — | — |
| `renderVideo` | 读 | ❔ 无记录 | — | — | — |
| `reportResult` | 读 | ❔ 无记录 | — | — | — |
| `request` | 读 | ❔ 无记录 | — | — | — |
| `saveSession` | 读 | ❔ 无记录 | — | — | — |
| `saveToRecords` | 读 | ❔ 无记录 | — | — | — |
| `saveToRecordsCount` | 读 | ❔ 无记录 | — | — | — |
| `searchHelp` | 读 | ❔ 无记录 | — | — | — |
| `showPaymentList` | 读 | ❔ 无记录 | 资金 | — | — |
| `showRoot` | 读 | ❔ 无记录 | — | — | — |
| `showsInPattFragTag` | 读 | ❔ 无记录 | — | — | — |
| `signIn` | 读 | ❔ 无记录 | — | — | — |
| `signOut` | 读 | ❔ 无记录 | — | — | — |
| `soldShows` | 读 | ❔ 无记录 | — | — | — |
| `tariffEnterpriseTeam` | 读 | ❔ 无记录 | — | — | — |
| `tariffLevelUpgrading` | 读 | ❔ 无记录 | — | — | — |
| `tariffTplMembershipUpgrading` | 读 | ❔ 无记录 | — | — | — |
| `tariffTrafficPackage` | 读 | ❔ 无记录 | — | — | — |
| `team` | 读 | ❔ 无记录 | — | — | — |
| `teamBalance` | 读 | ❔ 无记录 | — | — | — |
| `teamBills` | 读 | ❔ 无记录 | — | — | — |
| `teamShows` | 读 | ❔ 无记录 | — | — | — |
| `teamShowsCount` | 读 | ❔ 无记录 | — | — | — |
| `teamSubAccounts` | 读 | ❔ 无记录 | — | — | — |
| `teamWalletDetail` | 读 | ❔ 无记录 | — | — | — |
| `teamWalletOrder` | 读 | ❔ 无记录 | — | — | — |
| `templateComp` | 读 | ❔ 无记录 | — | — | — |
| `templateItems` | 读 | ❔ 无记录 | — | — | — |
| `trafficPackagesForShow` | 读 | ❔ 无记录 | — | — | — |
| `trafficPackageShows` | 读 | ❔ 无记录 | — | — | — |
| `uploadToken` | 读 | ❔ 无记录 | — | — | — |
| `validateTeamShow` | 读 | ❔ 无记录 | — | — | — |
| `apiKey` | 读 | ✅ 实测通过 | 账号凭据 | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {apiKeys,currentCount,availableCount,totalCount,capability} |
| `audioCategories` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(5) |
| `audioSources` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(1) |
| `authorState` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {state} |
| `bills` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：账单数组 |
| `blacklist` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {} |
| `canCreateOrder` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 boolean true |
| `contacts` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(0) |
| `deletedShows` | 读 | ✅ 实测通过 | 删除/清空 | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：回收站数组 |
| `followers` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {count,rows} |
| `followState` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {state} |
| `forms` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {totalRecords,columns,rows} |
| `fragmentTagDetails` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(0) |
| `fragmentTagsOrder` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 null |
| `getImageTags` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：该素材自身的标签列表；回读 Array(0) |
| `getPublishedUserExhibits` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {count,exhibits} |
| `getShow` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：元信息且 show_id 一致 |
| `goodses` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {count,goodses} |
| `goodsFavorites` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {count,goodses} |
| `goodsFavoriteTagOrder` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 null |
| `goodsFavoriteTagOrderMap` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {tags,tagsOrder} |
| `goodsFavoriteTagState` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(0) |
| `homeSlogans` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(4) |
| `homeTagOrderMap` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {tags,tagsOrder} |
| `homeTags` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(0) |
| `homeTagShows` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {count,exhibits} |
| `imagesCount` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 number 0 |
| `imageTagAssets` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：按标签反查素材；回读 Array(1) |
| `imageTagDetails` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · `imageTagDetails(改名后)` · 2026-09-21 01:32 | 期望：读到改名后的标签；回读 Array(1) |
| `imageTags` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(0) |
| `imageTagsOrder` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 null |
| `imageUntags` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(0) |
| `invoicesCount` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 number 0 |
| `invoicesLast` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 null |
| `listAudios` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(0) |
| `listImages` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：图片数组 |
| `listPattFragTags` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(0) |
| `listShows` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：作品数组 |
| `listTags` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：我的标签列表 |
| `listTemplates` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：模板数组 |
| `listVideos` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(0) |
| `loginHistory` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(8) |
| `me` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：当前用户对象 |
| `messages` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：消息数组 |
| `messageSettings` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {mute_invitation,mute_be_saved_to,mute_new_show} |
| `messagesStatus` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {totalCount,unreadCount,importanCount} |
| `myGoodses` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {count,goodses} |
| `notify` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 null |
| `orders` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：订单数组 |
| `palette` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(0) |
| `pattFragTagsOrder` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 null |
| `previewUri` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：预览链接非空 |
| `publishedUser` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {user_sid,unique_uid,nickname,avatar_url,brand_name,level,sub_account,userpage_url,…} |
| `publishedUserExhibits` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {count,exhibits} |
| `publishedUserExhibitsOnMyPage` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {count,exhibits} |
| `readShowData` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · `readShowData(editing)` · 2026-09-21 01:07 | 草稿版本可读 |
| `recommendedHelp` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(11) |
| `resetPhoneState` | 读 | ✅ 实测通过 | 删除/清空 账号凭据 | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 undefined |
| `showGoodsRank` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {count,items} |
| `showGoodsTagsTree` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(1) |
| `showHistories` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：历史版本数组 |
| `showsCount` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：计数 |
| `showsInTag` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(0) |
| `showStatistics` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {show_id,type,version,usage_scenario,title,desc,cover,loading_icon,…} |
| `showsUntag` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(3) |
| `specialOffer` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 undefined |
| `statisticsShow` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {show_id,type,version,usage_scenario,title,desc,cover,loading_icon,…} |
| `sysInfo` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：站点配置项 |
| `tagsAndOrder` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {tags,tagsOrder} |
| `tagsOrder` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 null |
| `teams` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：团队数组（普通账号可能为空） |
| `teamWallets` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(0) |
| `templateMembership` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {days,is_member} |
| `templateMembershipState` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {membership_state,expired} |
| `templateTagsTree` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(1) |
| `tplGoodsBoughtState` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {toDay,longDay,maxToday,maxLongDay,outOfToday,outOfLongDay} |
| `tplGoodsCount` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 number 0 |
| `trafficPackages` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {traffic,hasPackage} |
| `trafficPackageUsage` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：流量信息对象 |
| `usedFragmentsCount` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {used,total} |
| `usedImagesCount` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {used,total} |
| `userCoin` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {coinCount} |
| `userIdentity` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 undefined |
| `userInfo` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：user 对象 |
| `userInvitation` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {allowInvitation,invitedCount,invitationLink} |
| `userSetting` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {show.receive.type,studio.appearance.desk.background,studio.asset.images.watermark} |
| `walletBalance` | 读 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：余额字段 |
| `watermark` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 {watermarks,readOnly} |
| `watermarkAll` | 读 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 回读 Array(0) |

### 写操作（205）

| 方法 | 类型 | 状态 | 风险标注 | 证据（脚本 · 用例 · 时间） | 说明 / 错误 |
|---|---|---|---|---|---|
| `addFragmentTag` | 写 | ❌ 实测未通过 | — | `verify_ops.mjs` · 2026-09-21 01:32 | Common:Failed_NotFound |
| `setPalette` | 写 | ❌ 实测未通过 | 修改 | `verify_ops.mjs` · 2026-09-21 01:31 | Common:Failed: "undefined" is not valid JSON |
| `updateUserSetting` | 写 | ❌ 实测未通过 | 修改 | `verify_ops.mjs` · 2026-09-21 01:31 | HTTP 404 |
| `addCommentRightUser` | 写 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 评论白名单写的是第三方标识；且进回收站后仍留在黑名单里，没有干净的还原路径 |
| `adminCreateTemplate` | 写 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 管理端接口，普通账号预期 403 |
| `createTeam` | 写 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 账号非团队版；建团队会改变账号形态（子账号/账单），不做 |
| `follow` | 写 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 关注写的是他人账号的粉丝关系，越出「只动自己数据」的边界 |
| `markMessageRead` | 写 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 账号消息列表为空，无法构造「未读 → 已读」的可观测变化 |
| `orderShowGoods` | 写 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 真实资金 |
| `payOrder` | 写 | ⛔ 环境受限 | 资金 | `verify_ops.mjs` · 2026-09-21 01:32 | 真实资金 |
| `purchaseGoods` | 写 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 真实资金 |
| `rechargeWallet` | 写 | ⛔ 环境受限 | 资金 | `verify_ops.mjs` · 2026-09-21 01:32 | 真实资金 |
| `renameFragmentTag` | 写 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 依赖 addFragmentTag 先建出标签；创建路径未确认（paper/tags → Failed_NotFound，paper/comp/tags → 404） |
| `setTrafficPackageUsage` | 写 | ⛔ 环境受限 | 修改 | `verify_matrix.mjs` · 2026-09-21 01:07 | 账号无流量包：Common:Failed_NotFound: package provider missing |
| `uploadImageFile` | 写 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 需要构造 multipart 文件体；与 uploadImageBase64 同一落库路径，本轮不重复验证 |
| `uploadVideoFile` | 写 | ⛔ 环境受限 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 同上，且视频素材体积大 |
| `withdrawCash` | 写 | ⛔ 环境受限 | 资金 | `verify_ops.mjs` · 2026-09-21 01:32 | 真实资金 |
| `deleteFragmentTag` | 写 | 🟡 调用被接受 | 删除/清空 | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：DELETE 路径被服务端受理（标签本就不存在，语义未验证）；DELETE /api/fragments/v5/paper/comp/tag/{tag} 返回 200；因创建路径未确认，未验证语义 |
| `setImageTagsOrder` | 写 | 🟡 调用被接受 | 修改 | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：order 以字符串形态提交（实测数组会被服务端拒）；服务端受理；账号无标签，顺序无可观测差异 |
| `addCommentRightTeam` | 写 | ◻ 声明未实测 | — | — | — |
| `addCustomDomain` | 写 | ◻ 声明未实测 | — | — | — |
| `addExhibit` | 写 | ◻ 声明未实测 | — | — | — |
| `addHelp` | 写 | ◻ 声明未实测 | — | — | — |
| `addHomeTag` | 写 | ◻ 声明未实测 | — | — | — |
| `addPartnerApp` | 写 | ◻ 声明未实测 | — | — | — |
| `applyAuthor` | 写 | ◻ 声明未实测 | — | — | — |
| `assignGoodsTags` | 写 | ◻ 声明未实测 | — | — | — |
| `bindPhone` | 写 | ◻ 声明未实测 | 账号凭据 | — | — |
| `changeGoodsPrice` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `clearHomeTag` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `clearImagesInTag` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `clearImageTags` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `clearImageUntags` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `clearTagAll` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `closeOrder` | 写 | ◻ 声明未实测 | — | — | — |
| `collectImage` | 写 | ◻ 声明未实测 | — | — | — |
| `createApiKey` | 写 | ◻ 声明未实测 | 账号凭据 | — | — |
| `createOrder` | 写 | ◻ 声明未实测 | — | — | — |
| `createShowFromPurchasedGoods` | 写 | ◻ 声明未实测 | — | — | — |
| `deleteApiKey` | 写 | ◻ 声明未实测 | 删除/清空 账号凭据 | — | — |
| `deleteCertFile` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `deleteComments` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `deleteContact` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `deleteGoodsFavoriteTag` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `deleteHelp` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `deleteLegacyFragment` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `deletePartnerApp` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `deleteResetPhone` | 写 | ◻ 声明未实测 | 删除/清空 账号凭据 | — | — |
| `disableApiKey` | 写 | ◻ 声明未实测 | 账号凭据 | — | — |
| `emailResetPasswordAuth` | 写 | ◻ 声明未实测 | 账号凭据 | — | — |
| `enableApiKey` | 写 | ◻ 声明未实测 | 账号凭据 | — | — |
| `extendLifeByCoin` | 写 | ◻ 声明未实测 | — | — | — |
| `extractHeadings` | 写 | ◻ 声明未实测 | — | — | — |
| `fragmentTagsOrderLiteral` | 写 | ◻ 声明未实测 | — | — | — |
| `freezeUser` | 写 | ◻ 声明未实测 | — | — | — |
| `helpCheck` | 写 | ◻ 声明未实测 | — | — | — |
| `imageFromQqMap` | 写 | ◻ 声明未实测 | — | — | — |
| `imageFromWxLink` | 写 | ◻ 声明未实测 | — | — | — |
| `importImageFromAnyStorage` | 写 | ◻ 声明未实测 | — | — | — |
| `markGoodsFavoriteTagsRead` | 写 | ◻ 声明未实测 | — | — | — |
| `orderEnterpriseTeam` | 写 | ◻ 声明未实测 | — | — | — |
| `orderExhibits` | 写 | ◻ 声明未实测 | — | — | — |
| `orderTplShowGoods` | 写 | ◻ 声明未实测 | — | — | — |
| `outlinkImage` | 写 | ◻ 声明未实测 | — | — | — |
| `putGoodsOnSale` | 写 | ◻ 声明未实测 | — | — | — |
| `qrshareSave` | 写 | ◻ 声明未实测 | — | — | — |
| `qrshareShare` | 写 | ◻ 声明未实测 | — | — | — |
| `qrToken` | 写 | ◻ 声明未实测 | — | — | — |
| `qrTokenRevoke` | 写 | ◻ 声明未实测 | — | — | — |
| `recommendedHelpAdd` | 写 | ◻ 声明未实测 | — | — | — |
| `redeemWallet` | 写 | ◻ 声明未实测 | — | — | — |
| `registerCosVideo` | 写 | ◻ 声明未实测 | — | — | — |
| `registerOssVideo` | 写 | ◻ 声明未实测 | — | — | — |
| `registerPhone` | 写 | ◻ 声明未实测 | 账号凭据 | — | — |
| `removeCustomDomain` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `removeEmail` | 写 | ◻ 声明未实测 | 删除/清空 账号凭据 | — | — |
| `removeExhibit` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `removeGoodsFavorite` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `removeGoodsFavoriteTag` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `removeGoodsFromFavoriteTag` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `removeHomeTag` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `removePublisherIdentity` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `removeShowFromHomeTag` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `removeTeam` | 写 | ◻ 声明未实测 | 删除/清空 | — | — |
| `renameGoodsFavoriteTag` | 写 | ◻ 声明未实测 | — | — | — |
| `renameHomeTag` | 写 | ◻ 声明未实测 | — | — | — |
| `renameTagLegacy` | 写 | ◻ 声明未实测 | — | — | — |
| `requireInvoice` | 写 | ◻ 声明未实测 | — | — | — |
| `resetApiKey` | 写 | ◻ 声明未实测 | 删除/清空 账号凭据 | — | — |
| `resetPartnerAppSecret` | 写 | ◻ 声明未实测 | 删除/清空 账号凭据 | — | — |
| `resetPassword` | 写 | ◻ 声明未实测 | 删除/清空 账号凭据 | — | — |
| `revokeApplication` | 写 | ◻ 声明未实测 | — | — | — |
| `revokeInvoice` | 写 | ◻ 声明未实测 | — | — | — |
| `saveInlineImageData` | 写 | ◻ 声明未实测 | — | — | — |
| `saveInvoice` | 写 | ◻ 声明未实测 | — | — | — |
| `scanImageInfringement` | 写 | ◻ 声明未实测 | — | — | — |
| `setAssetsTags` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `setEmail` | 写 | ◻ 声明未实测 | 账号凭据 修改 | — | — |
| `setFollow` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `setGoodsFavoriteTagOrder` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `setGoodsFavoriteTagOrderPaper` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `setHomeTagsOrder` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `setPhone` | 写 | ◻ 声明未实测 | 账号凭据 修改 | — | — |
| `setPublisherIdentity` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `setUserIdentity` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `stopGoodsSale` | 写 | ◻ 声明未实测 | — | — | — |
| `submitApplication` | 写 | ◻ 声明未实测 | — | — | — |
| `submitIssue` | 写 | ◻ 声明未实测 | — | — | — |
| `submitResetPhone` | 写 | ◻ 声明未实测 | 账号凭据 | — | — |
| `templateAllowed` | 写 | ◻ 声明未实测 | — | — | — |
| `transferCoin` | 写 | ◻ 声明未实测 | 资金 | — | — |
| `transferTeamWallet` | 写 | ◻ 声明未实测 | 资金 | — | — |
| `transferWallet` | 写 | ◻ 声明未实测 | 资金 | — | — |
| `trashCommentRightTeam` | 写 | ◻ 声明未实测 | — | — | — |
| `trashCommentRightUser` | 写 | ◻ 声明未实测 | — | — | — |
| `unbindOwnerPartnerApp` | 写 | ◻ 声明未实测 | 账号凭据 | — | — |
| `unbindPartnerApp` | 写 | ◻ 声明未实测 | 账号凭据 | — | — |
| `unfollow` | 写 | ◻ 声明未实测 | — | — | — |
| `updateApplication` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `updateContact` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `updateCustomDomain` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `updateMyHomeInfo` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `updatePartnerApp` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `updateTeam` | 写 | ◻ 声明未实测 | 修改 | — | — |
| `upgradeByCoin` | 写 | ◻ 声明未实测 | — | — | — |
| `uploadCdnImage` | 写 | ◻ 声明未实测 | — | — | — |
| `uploadSvgContent` | 写 | ◻ 声明未实测 | — | — | — |
| `addContact` | 写 | ❔ 无记录 | — | — | — |
| `addPattFragTag` | 写 | ❔ 无记录 | — | — | — |
| `agreeAccess` | 写 | ❔ 无记录 | — | — | — |
| `agreeReject` | 写 | ❔ 无记录 | — | — | — |
| `changePassword` | 写 | ❔ 无记录 | 账号凭据 修改 | — | — |
| `clearAvatar` | 写 | ❔ 无记录 | 删除/清空 | — | — |
| `clearImages` | 写 | ❔ 无记录 | 删除/清空 | — | — |
| `clearPattFragTag` | 写 | ❔ 无记录 | 删除/清空 | — | — |
| `clearTagFragments` | 写 | ❔ 无记录 | 删除/清空 | — | — |
| `clearUntagFragments` | 写 | ❔ 无记录 | 删除/清空 | — | — |
| `createShow` | 写 | ❔ 无记录 | — | — | — |
| `del` | 写 | ❔ 无记录 | — | — | — |
| `deleteFormCount` | 写 | ❔ 无记录 | 删除/清空 | — | — |
| `deleteFormData` | 写 | ❔ 无记录 | 删除/清空 | — | — |
| `deleteInvoice` | 写 | ❔ 无记录 | 删除/清空 | — | — |
| `emailAuth` | 写 | ❔ 无记录 | 账号凭据 | — | — |
| `emailAuthAction` | 写 | ❔ 无记录 | 账号凭据 | — | — |
| `emailChange` | 写 | ❔ 无记录 | 账号凭据 | — | — |
| `emailResetPassword` | 写 | ❔ 无记录 | 账号凭据 | — | — |
| `emailValidate` | 写 | ❔ 无记录 | 账号凭据 | — | — |
| `importWxArticle` | 写 | ❔ 无记录 | — | — | — |
| `post` | 写 | ❔ 无记录 | — | — | — |
| `put` | 写 | ❔ 无记录 | — | — | — |
| `recommendedHelpRemove` | 写 | ❔ 无记录 | — | — | — |
| `registerCosObject` | 写 | ❔ 无记录 | — | — | — |
| `removeFragmentTag` | 写 | ❔ 无记录 | 删除/清空 | — | — |
| `removePattFragTag` | 写 | ❔ 无记录 | 删除/清空 | — | — |
| `renamePattFragTag` | 写 | ❔ 无记录 | — | — | — |
| `restoreShow` | 写 | ❔ 无记录 | — | — | — |
| `revokeApplicationDelete` | 写 | ❔ 无记录 | — | — | — |
| `save` | 写 | ❔ 无记录 | — | — | — |
| `setAvatar` | 写 | ❔ 无记录 | 修改 | — | — |
| `setFragmentTagsOrder` | 写 | ❔ 无记录 | 修改 | — | — |
| `setNickname` | 写 | ❔ 无记录 | 修改 | — | — |
| `setPattFragTagsOrder` | 写 | ❔ 无记录 | 修改 | — | — |
| `smsAuthAction` | 写 | ❔ 无记录 | — | — | — |
| `smsAuthManual` | 写 | ❔ 无记录 | — | — | — |
| `smsAuthSkip` | 写 | ❔ 无记录 | — | — | — |
| `smsChangePhone` | 写 | ❔ 无记录 | 账号凭据 | — | — |
| `smsRegister` | 写 | ❔ 无记录 | — | — | — |
| `smsResetPassword` | 写 | ❔ 无记录 | 账号凭据 | — | — |
| `smsValidatePhone` | 写 | ❔ 无记录 | 账号凭据 | — | — |
| `submitReleaseApplication` | 写 | ❔ 无记录 | — | — | — |
| `unbindApple` | 写 | ❔ 无记录 | 账号凭据 | — | — |
| `unbindQq` | 写 | ❔ 无记录 | 账号凭据 | — | — |
| `unbindWechat` | 写 | ❔ 无记录 | 账号凭据 | — | — |
| `unbindWeibo` | 写 | ❔ 无记录 | 账号凭据 | — | — |
| `updateFormCount` | 写 | ❔ 无记录 | 修改 | — | — |
| `updateInvoice` | 写 | ❔ 无记录 | 修改 | — | — |
| `upFragment` | 写 | ❔ 无记录 | — | — | — |
| `uploadCdnToken` | 写 | ❔ 无记录 | — | — | — |
| `wxArticleData` | 写 | ❔ 无记录 | — | — | — |
| `addImageOutlink` | 写 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：可被服务端抓取的外链图片进入自己的图库；asset_id=5427386904 |
| `addImageTag` | 写 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：打标签后能从该素材回读；素材标签含 vops_22385 |
| `addTag` | 写 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：标签写入后可从 listTags 回读 |
| `clearTag` | 写 | ✅ 实测通过 | 删除/清空 | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：DELETE 成功（此时该标签已无引用） |
| `copyShow` | 写 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：产生新的 show_id |
| `createBlankShow` | 写 | ✅ 实测通过 | — | `verify_ops.mjs` · `createBlankShow(ops)` · 2026-09-21 01:18 | 期望：返回 show_id |
| `deleteAsset` | 写 | ✅ 实测通过 | 删除/清空 | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：删除后图库列表不再含该素材；asset_id=5427386904 已从图库消失 |
| `deleteImageTag` | 写 | ✅ 实测通过 | 删除/清空 | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：删除后账号级标签列表不再含它；账户级标签已删除 |
| `deleteShow` | 写 | ✅ 实测通过 | 删除/清空 | `verify_ops.mjs` · `deleteShow(载体清理)` · 2026-09-21 01:32 | 期望：清理载体作品；载体作品已删除（进回收站） |
| `recoverShow` | 写 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：恢复后元信息可读 |
| `removeImageTag` | 写 | ✅ 实测通过 | 删除/清空 | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：摘标签后素材标签列表不再含它；素材标签已摘除 |
| `removeTag` | 写 | ✅ 实测通过 | 删除/清空 | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：移除后标签列表不再含该标签 |
| `renameImageTag` | 写 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：改名后账号级标签列表出现新名；新名 vops_22385_r 已出现 |
| `renameShow` | 写 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：读草稿→改 title→整包 PUT 后回读 title 变化；title=verify_ops 改名 4421 |
| `renameTag` | 写 | ✅ 实测通过 | — | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：重命名后旧名消失新名出现 |
| `sendShow` | 写 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：发给自己的副本产生新的 show_id（随后删除）；副本 show_id=727062272（已删除） |
| `setBackground` | 写 | ✅ 实测通过 | 修改 | `verify_ops.mjs` · 2026-09-21 01:31 | 期望：写入「无背景」后 userSetting 出现对应键；studio.appearance.desk.background 已写入 |
| `setMute` | 写 | ✅ 实测通过 | 修改 | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：三个静音开关 0→1 回读、1→0 回读；3 个开关各切一次并还原 |
| `setRightAccessPrivilege` | 写 | ✅ 实测通过 | 修改 | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：PUT 后回读权限位变化（随后还原） |
| `setShowReceiveType` | 写 | ✅ 实测通过 | 修改 | `verify_ops.mjs` · 2026-09-21 01:31 | 期望：原样写回当前值，回读一致（零差异）；show.receive.type 写回后回读一致 |
| `setTagsOrder` | 写 | ✅ 实测通过 | 修改 | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：order 以字符串提交、按当前顺序原样写回，回读一致；0 个标签 原样排序 |
| `setWatermark` | 写 | ✅ 实测通过 | 修改 | `verify_ops.mjs` · 2026-09-21 01:31 | 期望：写入 null 水印后 userSetting 出现对应键；studio.asset.images.watermark 已写入（body 值为 null 时才被接受） |
| `setWechatNoShare` | 写 | ✅ 实测通过 | 修改 | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：PUT 后回读 wechat_no_share 变化（随后还原） |
| `updateShow` | 写 | ✅ 实测通过 | 修改 | `verify_matrix.mjs` · 2026-09-21 01:07 | 期望：PUT 后回读 title 变化 |
| `uploadImageBase64` | 写 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:32 | 期望：返回 target_uri（asset_type=0，不进图库列表）；target_uri=//img.xiumi.us/xmi/ua/5NATE/i/f829b914fc47cfc9c0747c119c27cf |
| `verifyHtmlCode` | 写 | ✅ 实测通过 | — | `verify_ops.mjs` · 2026-09-21 01:31 | 期望：返回处理后的 HTML（纯校验，无状态）；回读 string "<p>verify_ops</p>" |

---

## 怎么补

```bash
node scripts/verify_matrix.mjs            # 作品写链路（建→改→回读→删→恢复）
node scripts/verify_ops.mjs               # 只读面 + 素材/标签/设置/消息（可逆、零副作用）
node scripts/verify_ops.mjs --only=setMute  # 只跑某个方法
node scripts/coverage.mjs                 # 重新生成本页与 data/coverage.json
```

两条纪律：**写操作必须带回读断言**（只回 `code=0` 不算通过）；
**做不到可逆的宁可不测**，记 ⛔ 并写清原因，不产出假阴性。
