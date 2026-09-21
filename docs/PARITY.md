# 浏览器功能 ↔ API 对等矩阵

> **验收标准（用户定义）：浏览器里能操作的，这里都要能操作。**
>
> 这份文档是对这个标准的逐项对账。它回答的不是「接口有多少」，
> 而是「**网页上那个按钮，这里能不能按**」。

## 三个事实来源

| 面 | 来源 | 规模 |
|---|---|---|
| **UI 面** | `capture/routes_raw.json` —— 主页/编辑器 bundle 里的 angular 路由表 | **85** 个页面 |
| **接口面** | 客户端运行时自省（`Object.getOwnPropertyNames`）+ `docs/API-REFERENCE.md` | **58** 模块 / **399** 方法 |
| **状态** | `data/verification.json`（**只由验证脚本回写**）→ `docs/COVERAGE.md` | 115 ✅ / 2 🟡 / 3 ❌ / 22 ⛔ / 113 ◻ / 144 ❔ |

`routes_raw.json` 的复现：从 `edt.xiumius.cn` 的 `views_app_home_*.ng-tpl.min.js` 与
`views_app_studio_*.ng-tpl.min.js` 里抽 `$routeProvider` 的 state 定义。
那份文件末尾写着 `state 总数: 85`。

## 状态口径

> **状态不由这份文档手写**，也不由 JSDoc 注释决定 —— 全部来自
> [`COVERAGE.md`](./COVERAGE.md)。那份台账由 `scripts/coverage.mjs` 从
> `data/verification.json` 生成，而后者只能由 `scripts/verify_matrix.mjs` /
> `verify_ops.mjs` 回写（跑不通就写 ⛔ 并说明原因，不产出假阴性）。
> 下表只补充「UI 维度」特有的一类。

| 标记 | 含义 | 判定依据（不允许靠印象） |
|---|---|---|
| ✅ / 🟡 / ❌ / ⛔ | 见 [`COVERAGE.md`](./COVERAGE.md) 的图例 | 脚本跑出来的结果，写操作必带回读断言 |
| 🌐 | 本质是浏览器动作（OAuth 跳转、收银台） | 客户端只产出 URL，无法纯 HTTP 完成 |

## 总账

**399 个方法**（数字取自 `data/coverage.json`，由 `coverage.mjs` 自动写入）

| | 读（含 2 个静态） | 写 | 合计 |
|---|---|---|---|
| ✅ 端到端实测通过 | 89 | 26 | **115** |
| 🟡 调用被受理、语义未观测 | 0 | 2 | **2** |
| ❌ 实测不通过（**已知不对**） | 0 | 3 | **3** |
| ⛔ 环境受限（账号能力/不可逆） | 8 | 14 | **22** |
| ◻ 源码声明未实测 | 5 | 108 | **113** |
| ❔ 无任何记录 | 92 | 52 | **144** |

**85 个页面** —— 每个页面都有对应的操作方法入口（下面逐域列出）。

> **功能对等成立，验证覆盖还没拉满。** 有脚本证据的 142/399（35.6%）；
> 没证据的 257 个里，113 个只在源码注释里声明过「未实测」、144 个完全无记录。
>
> 与上一版的关键差别不在数字，而在**数字的来源**：它们现在是脚本算出来的。
> 上一版靠人记，于是有 222 项既不能说通、也不能说没通；现在同一批方法被明确
> 分成了「跑通了」「没跑但有声明」「连声明都没有」，并且 ❌ 那 3 项是具体可指的方法。

## 逐域对账

### 1. 创作编辑器

页面：`/studio/paper|booklet|tablet|placard`、`/studio/placard/creator`

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 新建空白作品 | `createBlankShow` | ✅ |
| 保存 / 另存 | `createShow` `updateShow` | ✅ |
| 打开并读取内容（草稿态 / 发布态） | `getShow` `getShowFull` `readShowData` | ✅ |
| 从零搭骨架、追加页 | `buildShow` `appendPage` | ✅ |
| 插入官方组件 | `templateItems` `templateComp` `listTemplates` `templateTagsTree` | ✅ |
| 上传图片到正文 | `uploadImageBase64` | ✅ |
| 上传大图（COS 直传） | `uploadCdnToken` `registerCosObject` `uploadCdnImage` | 🟡 |
| 上传视频 | `uploadVideoFile` `registerCosVideo` `registerOssVideo` | 🟡 |
| 上传 SVG / 自定义 HTML 校验 | `uploadSvgContent` `verifyHtmlCode` | 🟡 |
| 编辑器配色预设 | `palette` `setPalette` | 🟡 |
| 水印设置 | `watermark` `watermarkAll` `setWatermark` | 🟡 |
| 发布页背景图 | `setBackground` | 🟡 |
| 正文小标题提取 | `extractHeadings` `extractHeadings2` `headingTask` `headingWord` | 🟡 |
| 碎片库（收藏的组件片段） | `listFragments` `listFragmentsByTag` `fragmentTagDetails` `fragmentTagsOrder` `usedFragmentsCount` + 增删改标签 | 读 ✅ / 写 ❔ |
| 编辑器内联图片 | `saveInlineImageData` | 🟡 |

**渲染导出**（编辑器右上角「导出」）：

| 导出为 | 对应方法 | 状态 |
|---|---|---|
| PDF / 长图 / GIF / 视频 / 帧 / 组件 | `renderPdf` `renderScreenshot` `renderGif` `renderVideo` `renderFrames` `renderComp` `renderExport` | ⛔ 依赖渲染队列，未实测 |

### 2. 我的作品管理

页面：`/studio`、`/studio/recycle`、`/studio/papers|booklets|tablets|placards|manuscripts`

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 列表 / 计数 / 搜索 | `listShows` `showsCount` | ✅ |
| 改名 | `renameShow` | ❔ |
| 删除 → 回收站 | `deleteShow` | ✅ |
| 回收站列表 / 恢复 | `deletedShows` `deletedShowsRaw` `recoverShow` `restoreShow` `recoverableShows` | ✅ |
| 拷贝 / 发给别人 | `copyShow` `sendShow` | ✅ / ❔ |
| 历史版本 | `showHistories` | ✅ |
| 打标签 / 改标签 / 清空 / 排序 | `listTags` `addTag` `renameTag` `removeTag` `clearTag` `clearTagAll` `setTagsOrder` `tagsOrder` `tagsAndOrder` | 读 ✅ / 写 部分 🟡 |
| 按标签筛作品 / 未打标签 | `showsInTag` `showsUntag` `showsInPattFragTag` | ❔ |
| 预览链接 | `previewUri` | ✅ |
| 作品统计 | `showStatistics` `statisticsShow` `showPaymentList` | ❔ |

### 3. 作品状态页

页面：`/shows/:show_id`、`/adv`、`/hits`、`/formdata`、`/admin`

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 看访问量 / 浏览量明细 | `showStatistics` `statisticsShow` | ❔ |
| 去广告 | `showPaymentList` | ❔ |
| 查看收集的表单数据 | `formCount` `formData` | ❔ |
| 删除表单数据 / 改计数 | `deleteFormData` `deleteFormCount` `updateFormCount` | 部分 ❔ |
| 设置权限位 / 微信不分享 | `setRightAccessPrivilege` `setWechatNoShare` | ✅ |
| 流量包 | `trafficPackages` `trafficPackageUsage` `trafficPackagesForShow` `setTrafficPackageUsage` | ✅ / ⛔（免费版无流量包） |
| 接收类型 | `setShowReceiveType` | 🟡 |

### 4. 模板商城

页面：`/studio/shop/{paper,tablet,placard}` + `list` / `favorite` / `purchase` / `official_recommand` / `followers`、`/studio/shop/goodses/:id/preview`

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 浏览在售 / 官方推荐 / 我的已购 | `goodses` `officialRecommended` `myPurchased` `myPurchasedState` | ❔ |
| 收藏 / 取消收藏 / 收藏标签 | `goodsFavorites` `isGoodsFavorite` `removeGoodsFavorite` `goodsFavoriteTags` `goodsFavoriteTagShows` `goodsFavoriteTagItems` `goodsFavoriteTagState` `goodsFavoriteTagOrder` `goodsFavoriteTagOrderMap` | 读 ❔ / 写 🟡 |
| 收藏标签增删改排序 | `renameGoodsFavoriteTag` `deleteGoodsFavoriteTag` `removeGoodsFavoriteTag` `removeGoodsFromFavoriteTag` `setGoodsFavoriteTagOrder` `setGoodsFavoriteTagOrderPaper` `markGoodsFavoriteTagsRead` | 🟡 |
| 下单购买 | `orderShowGoods` `orderTplShowGoods` `purchaseGoods` `createOrder` `canCreateOrder` `payOrder` `closeOrder` | ⛔ 需真实支付 |
| 从已购创建作品 | `createShowFromPurchasedGoods` | 🟡 |
| 自己上架卖 | `putGoodsOnSale` `stopGoodsSale` `changeGoodsPrice` `assignGoodsTags` | 🟡 |
| 排行榜 / 商城标签树 | `showGoodsRank` `showGoodsTagsTree` | ❔ |

### 5. 素材库（图 / 音频 / 视频）

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 图库列表 / 计数 / 搜索 | `listImages` `imagesCount` `usedImagesCount` | 部分 ✅ |
| 上传（base64 / 文件 / CDN） | `uploadImageBase64` `uploadImageFile` `uploadCdnImage` | ✅ / 🟡 / 🟡 |
| 删除单张 | `deleteAsset` | ❔ |
| 图片标签：增删改 / 清空 / 排序 | `imageTags` `imageTagDetails` `imageTagAssets` `imageTagsOrder` `imageUntags` `addImageTag` `renameImageTag` `deleteImageTag` `clearImageTags` `clearImagesInTag` `clearImageUntags` `setImageTagsOrder` `setAssetsTags` | 读 ❔ / 写 🟡 |
| 清空整个图库 | `clearImages` | ❔ |
| 收外链图入库 / 采集 / 微信图 / 地图截图 | `addImageOutlink` `outlinkImage` `collectImage` `imageFromWxLink` `imageFromQqMap` `importImageFromAnyStorage` | 🟡 |
| 音频库 | `listAudios` `audioList` `audioCategories` `audioSources` `audioFile` | 读 ❔ / 文件 🟡 |
| 视频库 | `listVideos` `uploadVideoFile` `registerCosVideo` `registerOssVideo` | 🟡 |
| PSD 源文件 | `psdFile` | 🟡 |
| 图片侵权扫描 | `scanImageInfringement` | 🟡 |

### 6. 团队

页面：`/studio/teams` + `upgrade` / `identity` / `domain`、`/:team_id` + `info` / `shows` / `recycle`、`history_bills`、`orders`、`recharge`

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 团队列表 / 详情 / 成员子账号 | `teams` `team` `teamSubAccounts` | 读 部分 ✅ |
| 建 / 改 / 解散团队 | `createTeam` `updateTeam` `removeTeam` | ⛔ 当前账号无团队 |
| 团队作品 / 回收站 / 计数 | `teamShows` `teamShowsCount` `validateTeamShow` | ❔ |
| 团队身份认证 / 升级 | `team` 相关 + `tariffEnterpriseTeam` `orderEnterpriseTeam` | ⛔ |
| 自定义域名 | `customDomains` `customDomainsForShow` `addCustomDomain` `updateCustomDomain` `removeCustomDomain` | 读 ❔ / 写 🟡 |
| 团队钱包 / 流水 / 订单 | `teamBalance` `teamWallets` `teamBills` `teamWalletDetail` `teamWalletOrder` `tariffEnterpriseTeam` | 读 ❔ |
| 团队充值 / 转账 | `rechargeWallet`（team_id）`transferTeamWallet` | ⛔ |

### 7. 钱包 / 秀点

页面：`/user/recharge`、`/user/redeem`、`/user/transfer`、`/user/transfer_coin`、`/user/history_bills`

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 余额 / 流水 | `walletBalance` `bills` | ✅ |
| 秀点余额 / 收入 | `userCoin` `expectedIncome` `myIncomes` | ❔ |
| 充值 / 兑换码 | `rechargeWallet` `redeemWallet` | ⛔ 需真实支付 |
| 余额转账 / 秀点转移 | `transferWallet` `transferCoin` | ⛔ 需真实资金 |
| 提现 | `withdrawCash` | ⛔ |
| 秀点续期 / 升级 | `extendLifeByCoin` `upgradeByCoin` `tariffLevelUpgrading` | ⛔ |

### 8. 订单

页面：`/order`、`/item/:order_id/review`、`/item/:order_id/detail`

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 订单列表 / 详情 | `orders` `order` | ✅ / ❔ |
| 支付 / 关闭 / 评价 | `payOrder` `closeOrder`（评价未见对应方法） | ⛔ / ⬜ 待定位 |

### 9. 发票

页面：`/invoice`、`/invoice/:invoice_id`、`/item/:invoice_id/review`、`/item/:invoice_id/details`

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 发票列表 / 详情 / 最近一次 / 可开票 | `invoices` `invoice` `invoicesCount` `invoicesLast` `invoicesAvailable` | 读 ❔ |
| 新建 / 修改 / 删除发票信息 | `saveInvoice` `updateInvoice` `deleteInvoice` | 🟡 / ❔ |
| 申请开票 / 撤销申请 | `requireInvoice` `revokeInvoice` | 🟡 |

### 10. 账号设置与安全

页面：`/user/setting`、`/user/messages/setting`、`/user/apikey`、`/user/contacts`、`/user/ownerpartnerbind`、`/user/partnerbind(+/info/:app_id)`、`/user/showgoods`、`/user/upgrade`、`/user/invitation/:salt_code`、`/user/identity_application`、`/user/template_membership`、`/user/traffic_package`、`/user/publisher_identity`、`/user/author_qualification`

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 我的信息 / 设置读写 | `me` `userInfo` `userSetting` `updateUserSetting` | 读 ✅ / 写 🟡 |
| 昵称 / 头像 | `setNickname` `setAvatar` `clearAvatar` | ❔ |
| 改密码 / 重置密码 | `changePassword` `resetPassword` `smsResetPassword` `emailResetPassword` `emailResetPasswordAuth` | 🟡 |
| 手机号：绑定 / 换绑 / 预检 / 撤销申请 | `bindPhone` `setPhone` `smsChangePhone` `smsValidatePhone` `registerPhone` `submitResetPhone` `deleteResetPhone` `resetPhoneState` | 🟡 |
| 邮箱：设置 / 解绑 / 验证 | `setEmail` `removeEmail` `emailAuth` `emailAuthAction` `emailChange` `emailValidate` | 🟡 |
| 第三方绑定 / 解绑 | `unbindQq` `unbindWechat` `unbindWeibo` `unbindApple` `loginUrl` `bindUrl` `mobileWechatUrl` | 解绑 ❔ / 绑定 🌐 |
| 短信二次验证 | `smsAuthAction` `smsAuthManual` `smsAuthSkip` | ❔ |
| API Key：查看 / 新建 / 停用 / 启用 / 删除 / 重置 | `apiKey` `createApiKey` `disableApiKey` `enableApiKey` `deleteApiKey` `resetApiKey` | 读 ✅ / 写 🟡 |
| 联系人 | `contacts` `addContact` `updateContact` `deleteContact` | 读 ❔ / 写 🟡 |
| 合作方应用 | `partnerBind` `partnerInfo` `partnerAppBind` `partnerAppBindList` `partnerAppApplications` `ownerPartnerApp` `ownerPartnerAppDetail` `addPartnerApp` `updatePartnerApp` `deletePartnerApp` `unbindPartnerApp` `unbindOwnerPartnerApp` `resetPartnerAppSecret` | 读 ❔ / 写 🟡 |
| 消息静音开关 | `setMute` `setMuteLegacy` | 🟡 |
| 登录设备历史 | `loginHistory` | ❔ |
| 邀请码 | `invitation` `userInvitation` | ❔ |
| 实名 / 发布者身份 / 原创作者资质 | `userIdentity` `setUserIdentity` `publisherIdentity` `setPublisherIdentity` `removePublisherIdentity` `authorState` `applyAuthor` `myApplications` `applications` `submitApplication` `updateApplication` `revokeApplication` `revokeApplicationDelete` `originalityUploadUrl` `deleteCertFile` | 🟡 |
| 模板会员 | `templateMembership` `templateMembershipState` `tariffTplMembershipUpgrading` | ❔ |
| 流量包 | `trafficPackages` `trafficPackageShows` `tariffTrafficPackage` | ❔ / ⛔ |
| 我的商品（卖作品） | `myGoodses` `myGoodsInfo` | ❔ |
| 账号冻结 | `freezeUser` | 🟡 |
| 同意 / 拒绝协议 | `agreeAccess` `agreeReject` | ❔ |
| 登录 / 登出 | `login` `loadSession` `signIn` `signOut` `authSuccess` `emailLoginSuccess` `needCaptcha` `smsRegister` | ✅ / ❔ |

### 11. 消息

页面：`/user/messages`、`/user/messages/setting`

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 消息列表 / 未读状态 / 设置 | `messages` `messagesStatus` `messageSettings` `notify` | ✅ / ❔ |
| 标记已读 | `markMessageRead` | 🟡 |

### 12. 主页 / 社交 / 展位

页面：`/studio/userhome`(+`setup`)、`/u/:u_sid`(+`/shows`)、`/usold/:u_sid`

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 看自己 / 他人主页与作品 | `publishedUser` `publishedUserBySid` `getPublishedUser` `publishedUserExhibits` `getPublishedUserExhibits` `publishedUserExhibitsOnMyPage` `soldShows` | ❔ |
| 主页信息 | `updateMyHomeInfo` | 🟡 |
| 主页标签：增删改 / 清空 / 排序 | `homeTags` `homeTagShows` `homeTagOrderMap` `addHomeTag` `renameHomeTag` `removeHomeTag` `clearHomeTag` `removeShowFromHomeTag` `setHomeTagsOrder` | 读 ❔ / 写 🟡 |
| 展位：上架 / 下架 / 排序 | `addExhibit` `removeExhibit` `orderExhibits` | 🟡 |
| 关注 / 取关 / 粉丝 | `follow` `unfollow` `setFollow` `followState` `followers` `fansCount` | 🟡 / ❔ |

### 13. 评论区

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 读评论 / 分享邀请 | `comments` `commentShareToken` | ❔ |
| 评论白名单（个人 / 团队） | `commentRights` `addCommentRightUser` `addCommentRightTeam` `trashCommentRightUser` `trashCommentRightTeam` | ❔ / 🟡 |
| 清空评论 | `deleteComments` | 🟡 |

### 14. 二维码 / 分享

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 生成二维码 / 分享图 | `qrimage` `qrProgress` `qrToken` `qrTokenRevoke` | ❔ / 🟡 |
| 二维码分享配置 | `qrshare` `qrshareSave` `qrshareShare` | ❔ / 🟡 |

### 15. 表单 / 互动收集

页面：`/shows/:show_id/formdata`

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 表单列表 / 计数 | `forms` `formsCount` `formCount` | ❔ |
| 看数据 / 删数据 / 改计数 | `formData` `deleteFormData` `deleteFormCount` `updateFormCount` | ❔ |

### 16. 公众号 / 微信

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 导入公众号文章 | `importWxArticle` `wxArticleData` | ⚠️ 未实测（需可访问的文章链接） |
| 微信授权入口 | `mobileWechatUrl` `bindWechat` `unbindWechat` | 🌐 / ❔ |

### 17. 帮助 / 反馈 / 工单

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 搜帮助 / 推荐 | `help` `searchHelp` `recommendedHelp` | ❔ |
| 帮助条目增删（疑似运营侧） | `addHelp` `deleteHelp` `helpCheck` `recommendedHelpAdd` `recommendedHelpRemove` | 🟡 疑似 403 |
| 提交工单 / 举报 | `submitIssue` `reportResult` `issues` | 🟡 |

### 18. 站内模板管理（运营）

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 新建模板 | `adminCreateTemplate` | 🟡 普通账号应 403 |
| 模板可用性 | `templateAllowed` | 🟡 |

### 19. 站点信息

| 浏览器里能做的 | 对应方法 | 状态 |
|---|---|---|
| 站点版本 / 环境 | `sysInfo` | ✅ |
| 首页标语 / 特价 | `homeSlogans` `specialOffer` | ❔ |
| 帮助中心根 | `help` `support`？ | ❔ |

---

## 缺口汇总

> 这一节是**上一版**的静态盘点，保留下来做对照。当前缺口请直接看
> [`COVERAGE.md`](./COVERAGE.md) 里按状态排序的台账 —— 它会随每次验证脚本运行自动更新，
> 而下面这几张表不会。

### A. 明确没测过的（113 项 ◻，源码声明）

集中在四处，都是「批量增删改」类，风险低、容易补测：

| 域 | 未实测数 | 说明 |
|---|---|---|
| 钱包/订单/发票/商品 | 35 | 大半是 ⛔（需真实支付），剩下的是收藏标签类，可测 |
| 素材（图/音频/视频） | 22 | 标签增删改、外链入库、文件上传，大多可测 |
| 账号安全/凭据 | 18 | 涉及手机/邮箱/密码/API Key，**需谨慎**，多数应保持不测或只读验证 |
| 主页/社交/展位 | 11 | 可测（可逆） |
| 编辑器/组件/模板 | 11 | 可测 |
| 身份/资质/审核 | 9 | 提交后不可逆，不建议实测 |
| 团队 | 5 | ⛔ 无团队账号 |
| 二维码/分享 | 4 | 可测 |
| 评论区 | 3 | 可测 |
| 标签 | 2 | 可测 |
| 其他（联系人/域名/合作方/消息） | 16 | 可测 |

**可逆、可测的约 90 项**，本轮已经吃掉素材标签族、偏好设置、消息静音、
碎片标签、作品扩展这几块（见 COVERAGE 的逐方法台账）；剩下约 46 项被账号能力、
不可逆性或真实资金挡住。

### B. 无任何记录的（144 项 ❔）

读操作占绝大多数。它们在本轮之前**没有一条「我调了、我看到了预期结果」的记录**。
`verify_ops.mjs` 的只读批次就是冲这个来的：89 个只读方法现在有了脚本证据
（路由 + 鉴权 + 参数形状都通、拿到了值，返回值形状记进备注）。

### C. UI 有、接口未定位

| 页面/功能 | 情况 |
|---|---|
| 订单评价（`/item/:order_id/review`） | 未在客户端找到对应方法 |
| 表单数据的完整管理界面 | `forms(show_id)` 已实测通过；其余 `form*` 需表单型作品做载体，本轮造不出 |
| 团队「子账号」完整管理 | `teamSubAccounts` 是读；增删子账号未见方法 |
| 自定义域名验证流程 | 有 CRUD，但需要 team_id（团队版功能） |

---

## 怎么收口

三步，按顺序（**第 1 步已完成**）：

1. ~~把 `[未实测]` 从「人写的注释」改成「脚本回写的状态」~~ ✅
   现在状态只写在 `data/verification.json`，由 `scripts/verify_*.mjs` 回写，
   再由 `scripts/coverage.mjs` 渲染成 [`COVERAGE.md`](./COVERAGE.md)。
   源码里的 `[未实测]` 降级成「声明」，单独一列展示，不再冒充结论。
2. **继续补测可逆面**。已覆盖：只读面 91 项、素材/标签族、偏好设置、消息静音、
   作品写链路。剩下的按 COVERAGE.md 里 `❔ 无记录` 那 144 项往下清，
   全部走「建 → 改 → 回读 → 删」的可逆闭环；做不到可逆的记 ⛔ 并写清原因。
3. **对 ⛔/🌐 的项给浏览器通道**。`bindUrl` / OAuth 跳转、收银台这类
   本来就不是 API 能完成的；需要的时候用 Playwright 兜底，而不是硬凑接口。

## 复现

```bash
cd <repo>
node scripts/cli.mjs list --md          # 重新生成 docs/CAPABILITIES.md（399 方法 + 状态列）
node scripts/verify_matrix.mjs          # 作品写链路验证
node scripts/verify_ops.mjs             # 只读面 + 可逆写面
node scripts/coverage.mjs               # 由 verification.json 生成 COVERAGE.md
node scripts/scaffold/_interop.mjs      # 域名归属与 cookie 作用域
```

UI 面（85 个页面）的来源文件是 `capture/routes_raw.json`，由
`views_app_home_*` / `views_app_studio_*` 两个 ng-tpl bundle 抽取得到。
