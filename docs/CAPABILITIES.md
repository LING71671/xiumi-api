# 全站方法目录

> 由 `node scripts/cli.mjs list --md` 生成，共 **399** 个方法
> （静态 2 / 读 194 / 写 203）。
>
> 「类型」由源码静态推断：**读** / **写**。「删除/清空」「资金」「账号凭据」「修改」
> 是命名启发式标注，**只作提示**——哪些操作代价高由你自己判断，工具不做任何拦截。
>
> 调用方式见 [`../README.md`](../README.md)：`xiumi call <方法> [参数...]`。

## 静态方法（登录 / 载入会话）

| 方法 | 签名 | 类型 | 说明 |
|---|---|---|---|
| `loadSession` | `file, opts = {}` | 读 |  |
| `login` | `{ user, password, areaCode = 86, ...rest }` | 读 | 账密登录 |

## 读操作（194）

| 方法 | 签名 | 类型 | 说明 |
|---|---|---|---|
| `_me` | `—` | 读 |  |
| `adminTagDrop` | `opts = {}` | 读 |  |
| `adminTagNew` | `opts = {}` | 读 |  |
| `apiKey` | `—` | 读 · 账号凭据 |  |
| `appendPage` | `showData, { texts = [], imageSrc, type = 'paper', ground = true } = {}` | 读 | 往作品里追加一页 |
| `applications` | `opts = {}` | 读 |  |
| `audioCategories` | `—` | 读 |  |
| `audioFile` | `opts = {}` | 读 | [未实测] 取音频文件 |
| `audioList` | `opts = {}` | 读 |  |
| `audioSources` | `—` | 读 |  |
| `authorState` | `—` | 读 |  |
| `authSuccess` | `—` | 读 |  |
| `bills` | `{ limit = 20, page = 0 } = {}` | 读 |  |
| `bindUrl` | `provider /* 'qq' \| 'wechat' \| 'weibo' */` | 读 · 账号凭据 | 绑定 URL（交给浏览器打开，无法在纯 HTTP 客户端里自动完成） |
| `blacklist` | `—` | 读 |  |
| `buildShow` | `type = 'paper', title = '无标题'` | 读 | 造一份「有一个空 cube + 一页」的作品数据，可直接喂给 createShow / updateShow |
| `canCreateOrder` | `—` | 读 | 当前用户能否下单（风控/欠费等） |
| `commentRights` | `show_id` | 读 | 评论白名单 |
| `comments` | `show_id, { ver = Date.now(), ...rest } = {}` | 读 | 读某作品的评论 |
| `commentShareToken` | `show_id` | 读 | 评论邀请分享 token（拼出 /comment/v5 分享链接用） |
| `connectAccessCode` | `opts = {}` | 读 | 开放连接换取 access_code |
| `contacts` | `—` | 读 |  |
| `createBlankShow` | `type = 'paper', title = '无标题'` | 读 | 仅凭标题新建一个空白作品（等价于编辑器里点了「新建」） |
| `customDomains` | `—` | 读 |  |
| `customDomainsForShow` | `opts = {}` | 读 |  |
| `deletedShows` | `opts` | 读 · 删除/清空 | 回收站条目数组（每项含 deleted_show_id / orig_show_id） |
| `deletedShowsRaw` | `{ type, version, limit = 16, page = 0, search, enableFullTextSearch } = {}` | 读 · 删除/清空 | 回收站原始返回 {count, deletedShows:[...]} |
| `emailLoginSuccess` | `—` | 读 · 账号凭据 | 邮箱登录后的落地页（OAuth/邮件链接会跳这里） |
| `expectedIncome` | `opts = {}` | 读 |  |
| `extractHeadings2` | `opts = {}` | 读 | [未实测] 第二版提取接口；参数未枚举 |
| `fansCount` | `uid` | 读 | 某人的粉丝数 |
| `fetchJson` | `urlOrPath` | 读 | 取一段 JSON |
| `followers` | `{ page = 0, limit = 12 } = {}` | 读 | 粉丝列表 |
| `followState` | `uid` | 读 | 是否已关注某人 |
| `fontFaces` | `opts = {}` | 读 | 站内字体：批量取 woff @font-face（原提取结果为「方法未知」，此处按 GET） |
| `formCount` | `show_id` | 读 |  |
| `formData` | `show_id, { limit = 50, page = 0 } = {}` | 读 |  |
| `forms` | `—` | 读 |  |
| `formsCount` | `opts = {}` | 读 |  |
| `fragmentTagDetails` | `type = 'paper', category = 'comp', { team_id } = {}` | 读 | 碎片标签详情（含每个标签下的碎片） |
| `fragmentTagsOrder` | `type = 'paper', category = 'comp', { team_id } = {}` | 读 | 碎片标签排序（与 tag 维度共用，第一段是 show type、第二段是 category） |
| `get` | `—` | 读 |  |
| `getPublishedUser` | `uid` | 读 |  |
| `getPublishedUserExhibits` | `uid, opts` | 读 |  |
| `getShow` | `show_id, include = []` | 读 | 读取作品元信息 |
| `getShowFull` | `show_id` | 读 | 元信息 + 内容一次拿全 |
| `goodses` | `{ limit = 72, page = 0, show_type = 'paper', search, tag_id, tag_name, sort, ...rest } = {}` | 读 | 商城在售作品列表 |
| `goodsFavorites` | `opts = {}` | 读 |  |
| `goodsFavoriteTagItems` | `show_goods_id, tag_id` | 读 |  |
| `goodsFavoriteTagOrder` | `show_type = 'paper'` | 读 |  |
| `goodsFavoriteTagOrderMap` | `show_type = 'paper'` | 读 |  |
| `goodsFavoriteTags` | `—` | 读 |  |
| `goodsFavoriteTagShows` | `show_type, tag_id, opts = {}` | 读 |  |
| `goodsFavoriteTagState` | `show_type` | 读 |  |
| `headingTask` | `task_id` | 读 | [未实测] 查提取任务状态 |
| `headingWord` | `word_id` | 读 | [未实测] 取某个词的处理结果；原提取结果为「方法未知」，此处按 GET |
| `homeSlogans` | `—` | 读 |  |
| `homeTagOrderMap` | `uid` | 读 | 某人主页标签的排序映射 |
| `homeTags` | `uid, tag = 'all'` | 读 | 某人的主页标签（tag 默认 'all'） |
| `homeTagShows` | `uid, tag, { limit = 20, page = 0 } = {}` | 读 | 某标签下的作品 |
| `imagesCount` | `{ team_id } = {}` | 读 |  |
| `imageTagAssets` | `opts = {}` | 读 |  |
| `imageTagDetails` | `{ team_id } = {}` | 读 |  |
| `imageTags` | `{ team_id } = {}` | 读 |  |
| `imageTagsOrder` | `{ team_id } = {}` | 读 | 图片标签顺序 |
| `imageUntags` | `{ team_id } = {}` | 读 |  |
| `invitation` | `—` | 读 |  |
| `invoice` | `id` | 读 |  |
| `invoices` | `{ limit = 20, page = 0 } = {}` | 读 |  |
| `invoicesAvailable` | `{ include = [] } = {}` | 读 |  |
| `invoicesCount` | `—` | 读 |  |
| `invoicesLast` | `—` | 读 |  |
| `isGoodsFavorite` | `id` | 读 |  |
| `listAudios` | `{ limit = 20, offset = 0, team_id } = {}` | 读 |  |
| `listFragments` | `{ type = 'paper', category = 'comp', limit = 30, offset = 0, order = 'DESC', team_id } = {}` | 读 | 未打标签的碎片 |
| `listFragmentsByTag` | `tag, { type = 'paper', category = 'comp', limit = 30, offset = 0, order = 'DESC', team_id } = {}` | 读 | 按标签浏览碎片：GET /api/fragments/v5/{type}/{category}/tags/{tag} |
| `listImages` | `{ limit = 20, offset = 0, team_id, search } = {}` | 读 |  |
| `listPattFragTags` | `type = 'all', { team_id } = {}` | 读 |  |
| `listShows` | `{ type = 'paper', limit = 20, offset = 0, page, search, version, patternFragment, teamId, sortBy, enableFullTextSearch, source = 'mine' } = {}` | 读 | 作品列表（自己的 / 官方原型 / 团队） |
| `listTags` | `type = 'all', { team_id } = {}` | 读 | GET /api/shows/{type\|all}/tags |
| `listTemplates` | `{ tagCategory = 'paper-cp', tag_ids, q, match_level = 'default', sort = 'DESC', limit = 20, page = 0 } = {}` | 读 | 官方组件/模板库（21k+ 条） |
| `listVideos` | `{ limit = 20, offset = 0, team_id } = {}` | 读 |  |
| `loginHistory` | `—` | 读 |  |
| `loginUrl` | `provider /* 'qq' \| 'wechat' \| 'weibo' */` | 读 | 未登录态用第三方账号登录（同样只能走浏览器导航） |
| `me` | `—` | 读 |  |
| `messages` | `{ limit = 20, page = 0, state } = {}` | 读 |  |
| `messageSettings` | `—` | 读 |  |
| `messagesStatus` | `—` | 读 |  |
| `mobileWechatUrl` | `—` | 读 | 移动端微信 OAuth 入口（方法原提取为「未知」，按导航处理） |
| `myApplications` | `opts = {}` | 读 |  |
| `myGoodses` | `opts = {}` | 读 |  |
| `myGoodsInfo` | `—` | 读 |  |
| `myIncomes` | `opts = {}` | 读 |  |
| `myPurchased` | `opts = {}` | 读 |  |
| `myPurchasedState` | `opts = {}` | 读 |  |
| `needCaptcha` | `user = this.user` | 读 | 是否需要验证码（风险控制触发时为 true） |
| `notify` | `—` | 读 |  |
| `officialRecommended` | `opts = {}` | 读 |  |
| `officialShows` | `{ type = 'paper', version, limit = 16, page = 0, search, patternFragment, sortBy } = {}` | 读 |  |
| `officialShowsLegacy` | `opts = {}` | 读 |  |
| `order` | `order_id` | 读 | 单个订单详情 |
| `orderEnterpriseTeamLegacy` | `opts = {}` | 读 | 企业团队（旧入口） |
| `orders` | `{ limit = 20, page = 0 } = {}` | 读 |  |
| `originalityUploadUrl` | `opts = {}` | 读 | 原创审核材料上传入口（返回上传地址，不是直接传） |
| `ownerPartnerApp` | `opts = {}` | 读 | 我作为合作方拥有的应用列表 |
| `ownerPartnerAppDetail` | `opts = {}` | 读 |  |
| `palette` | `—` | 读 |  |
| `partnerAppApplications` | `opts = {}` | 读 |  |
| `partnerAppBind` | `opts = {}` | 读 | 合作方应用绑定关系（当前身份是被绑定方） |
| `partnerAppBindList` | `opts = {}` | 读 · 账号凭据 |  |
| `partnerBind` | `opts = {}` | 读 | 我的合作方绑定关系 |
| `partnerInfo` | `opts = {}` | 读 |  |
| `pattFragTagsOrder` | `{ team_id } = {}` | 读 |  |
| `previewUri` | `to, previewFor = 'normal'` | 读 | 生成预览链接（preview_for: normal \| ...） |
| `psdFile` | `opts = {}` | 读 | [未实测] 取 PSD 源文件 |
| `publishedUser` | `uid` | 读 | 他人主页基本信息（uid = unique_uid 或 user_sid） |
| `publishedUserBySid` | `user_sid` | 读 | 通过**会话 sid**看主页（分享链接落地用） |
| `publishedUserExhibits` | `uid, { limit, page } = {}` | 读 | 他人主页的作品列表 |
| `publishedUserExhibitsOnMyPage` | `uid, { limit, page } = {}` | 读 | 他人主页「展示」区作品 |
| `publisherIdentity` | `opts = {}` | 读 |  |
| `qrProgress` | `opts = {}` | 读 |  |
| `readShowData` | `showOrUrl, { editing = false } = {}` | 读 | 拉取作品数据 JSON |
| `recommendedHelp` | `—` | 读 |  |
| `recoverableShows` | `opts = {}` | 读 | 可恢复的作品（另一个入口） |
| `renderComp` | `opts = {}` | 读 |  |
| `renderExport` | `show_id, opts = {}` | 读 |  |
| `renderFrames` | `show_id, opts = {}` | 读 |  |
| `renderGif` | `show_id, opts = {}` | 读 |  |
| `renderPdf` | `show_id, opts = {}` | 读 |  |
| `renderScreenshot` | `show_id, opts = {}` | 读 |  |
| `renderVideo` | `show_id, opts = {}` | 读 |  |
| `reportResult` | `ok = true` | 读 | 举报处理结果 |
| `request` | `method, path, { query, body, form, raw = false, headers = {} } = {}` | 读 | 调用任意接口 |
| `resetPhoneState` | `—` | 读 · 删除/清空 · 账号凭据 |  |
| `save` | `showData, show_id` | 读 | 一步保存：给了 show_id 就 PUT，否则 POST 新建 |
| `saveSession` | `file` | 读 |  |
| `saveToRecords` | `opts = {}` | 读 |  |
| `saveToRecordsCount` | `opts = {}` | 读 |  |
| `searchHelp` | `q` | 读 |  |
| `showGoodsRank` | `opts = {}` | 读 |  |
| `showGoodsTagsTree` | `{ show_type = 'paper', tag_level_from = 2, tag_level_to = 0, ...rest } = {}` | 读 |  |
| `showHistories` | `show_id` | 读 | 作品的历史版本列表 |
| `showPaymentList` | `show_id` | 读 · 资金 |  |
| `showRoot` | `opts = {}` | 读 |  |
| `showsCount` | `type = 'paper', { version, patternFragment, search, enableFullTextSearch } = {}` | 读 |  |
| `showsInPattFragTag` | `tag, { type, team_id, limit = 16, page = 0, sortBy } = {}` | 读 |  |
| `showsInTag` | `tag, { type, team_id, limit = 16, page = 0, search, patternFragment, enableFullTextSearch, sortBy } = {}` | 读 |  |
| `showStatistics` | `show_id` | 读 |  |
| `showsUntag` | `{ type, team_id, limit = 16, page = 0, search, patternFragment, enableFullTextSearch, sortBy } = {}` | 读 |  |
| `signIn` | `—` | 读 |  |
| `signOut` | `—` | 读 |  |
| `soldShows` | `uid, { access_token, start_date, end_date, limit, page_width, page_height } = {}` | 读 | 某人「已售出」的作品 |
| `specialOffer` | `—` | 读 | 特价信息 |
| `statisticsShow` | `opts = {}` | 读 | 作品统计（另一个入口） |
| `sysInfo` | `—` | 读 |  |
| `tagsAndOrder` | `type = 'all', { team_id } = {}` | 读 |  |
| `tagsOrder` | `{ team_id } = {}` | 读 |  |
| `tariffEnterpriseTeam` | `team_id, opts = {}` | 读 | 企业团队价目 |
| `tariffLevelUpgrading` | `opts = {}` | 读 | 会员升级价目 |
| `tariffTplMembershipUpgrading` | `opts = {}` | 读 | 模板会员升级价目 |
| `tariffTrafficPackage` | `opts = {}` | 读 | 流量包价目 |
| `team` | `team_id` | 读 |  |
| `teamBalance` | `team_id` | 读 | 某团队钱包余额 |
| `teamBills` | `team_id, { limit = 20, page = 0 } = {}` | 读 | 某团队钱包流水 |
| `teams` | `—` | 读 |  |
| `teamShows` | `teamId, { type = 'all', version = 5, limit = 16, page = 0, search, patternFragment, sortBy } = {}` | 读 |  |
| `teamShowsCount` | `opts = {}` | 读 |  |
| `teamSubAccounts` | `team_id, opts = {}` | 读 |  |
| `teamWalletDetail` | `team_id` | 读 | 团队钱包明细 |
| `teamWalletOrder` | `team_id, { limit = 10, page = 0 } = {}` | 读 | 团队钱包订单流水 |
| `teamWallets` | `—` | 读 | 我加入的全部团队及其钱包（bundle：get("/api/wallet/team_balance")） |
| `templateComp` | `atom_tpl_id, mutate` | 读 | 从官方模板库取一个组件，直接变成可放进 `layer.comps.items` 的对象 |
| `templateItems` | `atom_tpl_id` | 读 | 取指定组件的 matrix + renderer_accelerate（可一次问多个 atom_tpl_id） |
| `templateMembership` | `—` | 读 |  |
| `templateMembershipState` | `—` | 读 |  |
| `templateTagsTree` | `{ tagCategory = 'paper-cp', tag_level_from = 2, tag_level_to = 0, template = false } = {}` | 读 |  |
| `tplGoodsBoughtState` | `opts = {}` | 读 |  |
| `tplGoodsCount` | `opts = {}` | 读 |  |
| `trafficPackages` | `—` | 读 |  |
| `trafficPackagesForShow` | `show_id` | 读 | 某作品可用的流量包 |
| `trafficPackageShows` | `opts = {}` | 读 |  |
| `trafficPackageUsage` | `show_id` | 读 |  |
| `uploadToken` | `{ upload_type = 'image', team_id } = {}` | 读 |  |
| `usedFragmentsCount` | `type = 'paper', { team_id } = {}` | 读 | 已用/可用碎片额度 |
| `usedImagesCount` | `{ team_id } = {}` | 读 |  |
| `userCoin` | `—` | 读 |  |
| `userIdentity` | `—` | 读 |  |
| `userInfo` | `include = []` | 读 |  |
| `userInvitation` | `—` | 读 |  |
| `userSetting` | `—` | 读 |  |
| `validateTeamShow` | `show_id` | 读 |  |
| `walletBalance` | `—` | 读 |  |
| `watermark` | `—` | 读 |  |
| `watermarkAll` | `—` | 读 | 水印是否对全部作品生效 |

## 写操作（203）

| 方法 | 签名 | 类型 | 说明 |
|---|---|---|---|
| `addCommentRightTeam` | `show_id, { team_name, team_id, ts } = {}` | 写 | [未实测] 加团队评论权限 |
| `addCommentRightUser` | `show_id, { name, email, area_code, phone, ts } = {}` | 写 | [未实测] 给作品加个人评论权限（白名单） |
| `addContact` | `payload` | 写 |  |
| `addCustomDomain` | `body` | 写 | [未实测] 新增自定义域名 |
| `addExhibit` | `show_id` | 写 | [未实测] 上架到主页展位 |
| `addFragmentTag` | `fragment_id, tag, { type = 'paper' } = {}` | 写 |  |
| `addHelp` | `body` | 写 | [未实测] 帮助条目（疑似站内运营用，普通账号可能 403） |
| `addHomeTag` | `published_shows_id, tag` | 写 | [未实测] 新建主页标签 |
| `addImageOutlink` | `image_url, { team_id, updateTsIfExisted = false } = {}` | 写 | 把外链图片收进图库 |
| `addImageTag` | `body` | 写 | [未实测] 新建图片标签 |
| `addPartnerApp` | `body` | 写 | [未实测] 申请/绑定合作方应用 |
| `addPattFragTag` | `show_id, tag` | 写 |  |
| `addTag` | `show_id, tag` | 写 | 给作品打标签（tag 会被 encodeURIComponent） |
| `adminCreateTemplate` | `body` | 写 | [未实测] 站内模板管理，普通账号应为 403 |
| `agreeAccess` | `body = {}` | 写 | 协议签署状态：同意 |
| `agreeReject` | `body = {}` | 写 | 协议签署状态：拒绝 |
| `applyAuthor` | `body` | 写 | [未实测] 申请成为原创作者 |
| `assignGoodsTags` | `body` | 写 | [未实测] 给商品打标签 |
| `bindPhone` | `body` | 写 · 账号凭据 | [未实测] 改绑手机 |
| `changeGoodsPrice` | `body` | 写 · 修改 | [未实测] 改价 |
| `changePassword` | `{ old_password, new_password }` | 写 · 账号凭据 · 修改 |  |
| `clearAvatar` | `—` | 写 · 删除/清空 |  |
| `clearHomeTag` | `tag` | 写 · 删除/清空 | [未实测] 清空某标签 |
| `clearImages` | `{ team_id } = {}` | 写 · 删除/清空 | 清空图库（scope: 个人或某个 team_id） |
| `clearImagesInTag` | `tag, { team_id } = {}` | 写 · 删除/清空 | [未实测] 清空某标签下的图片 |
| `clearImageTags` | `{ team_id } = {}` | 写 · 删除/清空 | [未实测] 清空全部图片标签 |
| `clearImageUntags` | `{ team_id } = {}` | 写 · 删除/清空 | [未实测] 清空未打标签的图片 |
| `clearPattFragTag` | `tag, { team_id } = {}` | 写 · 删除/清空 |  |
| `clearTag` | `tag, { team_id } = {}` | 写 · 删除/清空 |  |
| `clearTagAll` | `body` | 写 · 删除/清空 | [未实测] 清空某标签下全部作品的标签 |
| `clearTagFragments` | `type, category, tag, { team_id } = {}` | 写 · 删除/清空 |  |
| `clearUntagFragments` | `type = 'paper', category = 'comp', { team_id } = {}` | 写 · 删除/清空 |  |
| `closeOrder` | `order_id` | 写 | [未实测] 关闭订单 |
| `collectImage` | `show_id, body = {}` | 写 | [未实测] 采集图片（站内图片收集） |
| `copyShow` | `show, toUser` | 写 | 拷贝作品（可拷给自己 / 他人 / 团队） |
| `createApiKey` | `—` | 写 · 账号凭据 | [未实测] 新建 API Key，返回新建的 key |
| `createOrder` | `body` | 写 | [未实测] 通用下单 |
| `createShow` | `type, payload, { fromShowId, uniqueUid, toUser } = {}` | 写 | 保存/新建作品（编辑器「保存」的等价动作） |
| `createShowFromPurchasedGoods` | `id` | 写 | [未实测] 从已购商品创建自己的作品：POST /api/show_goods/purchased/goodses/{id}/show |
| `createTeam` | `body` | 写 | [未实测] 建团队 |
| `del` | `—` | 写 |  |
| `deleteApiKey` | `id` | 写 · 删除/清空 · 账号凭据 | [未实测] 删除某把 key |
| `deleteAsset` | `asset_id` | 写 · 删除/清空 |  |
| `deleteCertFile` | `body = {}` | 写 · 删除/清空 | [未实测] 删除证件文件 |
| `deleteComments` | `show_id` | 写 · 删除/清空 | [未实测] 清空某作品的评论 |
| `deleteContact` | `body = {}` | 写 · 删除/清空 | [未实测] 删联系人 |
| `deleteFormCount` | `body = {}` | 写 · 删除/清空 |  |
| `deleteFormData` | `body = {}` | 写 · 删除/清空 |  |
| `deleteFragmentTag` | `type, category, tag, { team_id } = {}` | 写 · 删除/清空 |  |
| `deleteGoodsFavoriteTag` | `show_type, tag_id` | 写 · 删除/清空 | [未实测] 商城收藏标签：删标签 |
| `deleteHelp` | `body` | 写 · 删除/清空 | [未实测] 路径可疑，可能提取有误 |
| `deleteImageTag` | `{ team_id } = {}` | 写 · 删除/清空 | [未实测] 删某个图片标签 |
| `deleteInvoice` | `body = {}` | 写 · 删除/清空 |  |
| `deleteLegacyFragment` | `body` | 写 · 删除/清空 | [未实测] 旧版碎片删除 |
| `deletePartnerApp` | `body = {}` | 写 · 删除/清空 | [未实测] 删除合作方应用 |
| `deleteResetPhone` | `t` | 写 · 删除/清空 · 账号凭据 | [未实测] 撤销已提交的换绑申请；t 是申请 id（路径段） |
| `deleteShow` | `show_id` | 写 · 删除/清空 | 删除作品（进回收站） |
| `disableApiKey` | `id` | 写 · 账号凭据 | [未实测] 停用某把 key |
| `emailAuth` | `body` | 写 · 账号凭据 |  |
| `emailAuthAction` | `body` | 写 · 账号凭据 |  |
| `emailChange` | `body` | 写 · 账号凭据 |  |
| `emailResetPassword` | `body` | 写 · 账号凭据 |  |
| `emailResetPasswordAuth` | `body` | 写 · 账号凭据 | [未实测] 邮箱重置密码（auth 命名空间下的另一个入口） |
| `emailValidate` | `body` | 写 · 账号凭据 |  |
| `enableApiKey` | `id` | 写 · 账号凭据 | [未实测] 启用某把 key |
| `extendLifeByCoin` | `body` | 写 | [未实测] 用秀点续期 |
| `extractHeadings` | `body` | 写 | [未实测] 提交正文提取小标题 |
| `follow` | `uid` | 写 | [未实测] 关注 |
| `fragmentTagsOrderLiteral` | `type = 'paper', category = 'comp'` | 写 | [未实测] 碎片标签顺序（按 type/category 字面量） |
| `freezeUser` | `body = {}` | 写 | [未实测] 冻结账号 |
| `helpCheck` | `body` | 写 | [未实测] 路径可疑，可能提取有误 |
| `imageFromQqMap` | `body` | 写 | [未实测] 地图截图转存 |
| `imageFromWxLink` | `body` | 写 | [未实测] 微信图片链接转存 |
| `importImageFromAnyStorage` | `body` | 写 | [未实测] 从任意存储导入图片 |
| `importWxArticle` | `articleurl` | 写 | 把公众号文章直接导入为一个作品 |
| `markGoodsFavoriteTagsRead` | `body = {}` | 写 | [未实测] 标记收藏标签已读 |
| `markMessageRead` | `message_id` | 写 | [未实测] 标记消息已读 |
| `orderEnterpriseTeam` | `team_id, body` | 写 | [未实测] 企业团队下单 |
| `orderExhibits` | `ordered_exhibits` | 写 | [未实测] 展位排序 |
| `orderShowGoods` | `body` | 写 | [未实测] 购买商城作品下单 |
| `orderTplShowGoods` | `body` | 写 | [未实测] 购买模板商品下单 |
| `outlinkImage` | `body` | 写 | [未实测] 外链图片（同 addImageOutlink，保留别名） |
| `payOrder` | `body` | 写 · 资金 | [未实测] 支付订单 |
| `post` | `—` | 写 |  |
| `purchaseGoods` | `body` | 写 | [未实测] 购买作品 |
| `put` | `—` | 写 |  |
| `putGoodsOnSale` | `body` | 写 | [未实测] 上架作品 |
| `qrshareSave` | `body` | 写 | [未实测] 保存二维码分享配置 |
| `qrshareShare` | `body` | 写 | [未实测] 发起二维码分享 |
| `qrToken` | `body` | 写 | [未实测] 生成二维码 token |
| `qrTokenRevoke` | `body = {}` | 写 | [未实测] 撤销二维码 token |
| `rechargeWallet` | `body` | 写 · 资金 | [未实测] 钱包充值 |
| `recommendedHelpAdd` | `body` | 写 | [未实测] 方法与路径组合可疑，可能提取有误 |
| `recommendedHelpRemove` | `body` | 写 |  |
| `recoverShow` | `deleted_show_id` | 写 | 从回收站恢复 |
| `redeemWallet` | `body` | 写 | [未实测] 兑换码充值 |
| `registerCosObject` | `{ object_name, team_id, watermark }` | 写 |  |
| `registerCosVideo` | `body` | 写 | [未实测] 登记已直传到 COS 的视频对象 |
| `registerOssVideo` | `body` | 写 | [未实测] 登记已直传到 OSS 的视频对象 |
| `registerPhone` | `body` | 写 · 账号凭据 | [未实测] 手机号注册（与 sms/register_user 并存的两套入口之一） |
| `removeCustomDomain` | `body` | 写 · 删除/清空 | [未实测] 删除自定义域名 |
| `removeEmail` | `body = {}` | 写 · 删除/清空 · 账号凭据 | [未实测] 解绑邮箱 |
| `removeExhibit` | `show_id` | 写 · 删除/清空 | [未实测] 下架展位 |
| `removeFragmentTag` | `fragment_id, tag, { type = 'paper' } = {}` | 写 · 删除/清空 |  |
| `removeGoodsFavorite` | `id` | 写 · 删除/清空 | [未实测] 取消收藏 |
| `removeGoodsFavoriteTag` | `show_type, tag_id` | 写 · 删除/清空 | [未实测] 删收藏标签 |
| `removeGoodsFromFavoriteTag` | `show_goods_id, tag_id, id3` | 写 · 删除/清空 | [未实测] 从收藏标签里移除某商品 |
| `removeHomeTag` | `uid, tag` | 写 · 删除/清空 | [未实测] 删除主页标签 |
| `removePattFragTag` | `show_id, tag` | 写 · 删除/清空 |  |
| `removePublisherIdentity` | `body = {}` | 写 · 删除/清空 | [未实测] 撤销发布者身份 |
| `removeShowFromHomeTag` | `uid, tag` | 写 · 删除/清空 | [未实测] 从主页标签移除作品 |
| `removeTag` | `show_id, tag` | 写 · 删除/清空 |  |
| `removeTeam` | `body = {}` | 写 · 删除/清空 | [未实测] 解散团队 |
| `renameFragmentTag` | `type, category, old_tag, new_tag, { team_id } = {}` | 写 |  |
| `renameGoodsFavoriteTag` | `body` | 写 | [未实测] 收藏标签重命名 |
| `renameHomeTag` | `old_tag, new_tag` | 写 | [未实测] 主页标签改名 |
| `renameImageTag` | `body` | 写 | [未实测] 图片标签重命名 |
| `renamePattFragTag` | `old_tag, new_tag, { team_id } = {}` | 写 |  |
| `renameShow` | `show_id, title` | 写 |  |
| `renameTag` | `old_tag, new_tag, { team_id } = {}` | 写 |  |
| `renameTagLegacy` | `body` | 写 | [未实测] 标签重命名（方法原提取为 DELETE，bundle 里是 POST） |
| `requireInvoice` | `body` | 写 | [未实测] 申请开票 |
| `resetApiKey` | `id` | 写 · 删除/清空 · 账号凭据 | [未实测] 重置某把 key 的密钥 |
| `resetPartnerAppSecret` | `body` | 写 · 删除/清空 · 账号凭据 | [未实测] 重置 AppSecret |
| `resetPassword` | `body` | 写 · 删除/清空 · 账号凭据 | [未实测] 重置密码（无验证渠道信息的通用入口） |
| `restoreShow` | `show_id` | 写 | 恢复（编辑器 restore 动作，部分账号可用） |
| `revokeApplication` | `body` | 写 | [未实测] 撤回审核申请 |
| `revokeApplicationDelete` | `body` | 写 |  |
| `revokeInvoice` | `body = {}` | 写 | [未实测] 撤销开票申请 |
| `saveInlineImageData` | `body` | 写 | [未实测] 保存编辑器内联图片数据 |
| `saveInvoice` | `body` | 写 | [未实测] 新建/修改发票信息 |
| `scanImageInfringement` | `show_id, body = {}` | 写 | [未实测] 图片侵权扫描 |
| `sendShow` | `show_id, { toSelfAccount, toUserAccount, toTeamAccount, title_postfix = '- 拷贝' } = {}` | 写 | 把作品发（拷贝）给另一个账号 / 团队 / 自己另一个号 |
| `setAssetsTags` | `body` | 写 · 修改 | [未实测] 批量打标签 |
| `setAvatar` | `avatar_url` | 写 · 修改 |  |
| `setBackground` | `body` | 写 · 修改 | [未实测] 发布页背景图 |
| `setEmail` | `body` | 写 · 账号凭据 · 修改 | [未实测] 设置/换绑邮箱 |
| `setFollow` | `body` | 写 · 修改 | [未实测] 关注 / 取关 |
| `setFragmentTagsOrder` | `type, category, order, { team_id } = {}` | 写 · 修改 |  |
| `setGoodsFavoriteTagOrder` | `show_type, order` | 写 · 修改 | [未实测] 设置收藏标签顺序 |
| `setGoodsFavoriteTagOrderPaper` | `order` | 写 · 修改 | [未实测] 商城收藏标签：按 paper 维度设顺序 |
| `setHomeTagsOrder` | `order` | 写 · 修改 | [未实测] 主页标签排序 |
| `setImageTagsOrder` | `order, { team_id } = {}` | 写 · 修改 | [未实测] 设置图片标签顺序 |
| `setMute` | `kind /* 'mute_new_show' \| 'mute_invitation' \| 'mute_be_saved_to' */, value` | 写 · 修改 |  |
| `setMuteLegacy` | `kind /* mute_new_show \| mute_invitation \| mute_be_saved_to */, value` | 写 · 修改 | [未实测] 旧版静音开关（无 setting 前缀，bundle 里两套并存） |
| `setNickname` | `nickname` | 写 · 修改 |  |
| `setPalette` | `body` | 写 · 修改 | [未实测] 调色板（编辑器配色预设） |
| `setPattFragTagsOrder` | `order, { team_id } = {}` | 写 · 修改 |  |
| `setPhone` | `body` | 写 · 账号凭据 · 修改 | [未实测] 改手机号（另一个入口） |
| `setPublisherIdentity` | `body` | 写 · 修改 | [未实测] 提交发布者身份 |
| `setRightAccessPrivilege` | `show_id, value` | 写 · 修改 | 设置作品权限位（right_access_privilege 的位含义见 docs） |
| `setShowReceiveType` | `value` | 写 · 修改 | [未实测] 作品接收类型；value 形如 0/1 |
| `setTagsOrder` | `order, { team_id } = {}` | 写 · 修改 |  |
| `setTrafficPackageUsage` | `show_id, value` | 写 · 修改 |  |
| `setUserIdentity` | `body` | 写 · 修改 | [未实测] 提交实名/资质信息 |
| `setWatermark` | `body` | 写 · 修改 | [未实测] 水印设置 |
| `setWechatNoShare` | `show_id, value` | 写 · 修改 |  |
| `smsAuthAction` | `body` | 写 | 短信验证码校验 —— 登录二步 / 敏感操作的通用动作入口 |
| `smsAuthManual` | `body` | 写 | 人工审核通道 |
| `smsAuthSkip` | `body` | 写 | 跳过二次验证（有风控条件） |
| `smsChangePhone` | `body` | 写 · 账号凭据 | 换绑手机号 |
| `smsRegister` | `body` | 写 | 短信注册新账号 |
| `smsResetPassword` | `body` | 写 · 账号凭据 | 短信重置密码 |
| `smsValidatePhone` | `body` | 写 · 账号凭据 | 校验手机号是否可用（发验证码前的预检） |
| `stopGoodsSale` | `body` | 写 | [未实测] 下架 |
| `submitApplication` | `body` | 写 | [未实测] 提交原创审核申请 |
| `submitIssue` | `body` | 写 | [未实测] 提交反馈/工单 |
| `submitReleaseApplication` | `show_id` | 写 |  |
| `submitResetPhone` | `body` | 写 · 账号凭据 | [未实测] 提交换绑手机申请 |
| `templateAllowed` | `body` | 写 | [未实测] 模板是否允许被使用 |
| `transferCoin` | `body` | 写 · 资金 | [未实测] 转移秀点 |
| `transferTeamWallet` | `body` | 写 · 资金 | [未实测] 团队钱包转账 |
| `transferWallet` | `body` | 写 · 资金 | [未实测] 余额转账 |
| `trashCommentRightTeam` | `show_id, { team_id } = {}` | 写 | [未实测] 把团队移入评论黑名单 |
| `trashCommentRightUser` | `show_id, { email, area_code, phone } = {}` | 写 | [未实测] 把个人移入评论黑名单（回收站） |
| `unbindApple` | `—` | 写 · 账号凭据 |  |
| `unbindOwnerPartnerApp` | `body = {}` | 写 · 账号凭据 | [未实测] 作为合作方解除对自己应用的绑定 |
| `unbindPartnerApp` | `body = {}` | 写 · 账号凭据 | [未实测] 解绑合作方应用 |
| `unbindQq` | `—` | 写 · 账号凭据 |  |
| `unbindWechat` | `—` | 写 · 账号凭据 |  |
| `unbindWeibo` | `—` | 写 · 账号凭据 |  |
| `unfollow` | `uid` | 写 | [未实测] 取关 |
| `updateApplication` | `body` | 写 · 修改 | [未实测] 修改审核申请 |
| `updateContact` | `body` | 写 · 修改 | [未实测] 改联系人 |
| `updateCustomDomain` | `body` | 写 · 修改 | [未实测] 修改自定义域名 |
| `updateFormCount` | `body` | 写 · 修改 |  |
| `updateInvoice` | `body` | 写 · 修改 |  |
| `updateMyHomeInfo` | `name, desc` | 写 · 修改 | [未实测] 改主页信息 |
| `updatePartnerApp` | `body` | 写 · 修改 | [未实测] 修改合作方应用 |
| `updateShow` | `showOrId, showData, { uniqueUid, savingToken, retryOnStale = true } = {}` | 写 · 修改 | 更新已有作品（编辑器「保存」在已有作品上的动作） |
| `updateTeam` | `body` | 写 · 修改 | [未实测] 改团队 |
| `updateUserSetting` | `body` | 写 · 修改 | [未实测] 通用设置写入；字段未枚举，原样透传 |
| `upFragment` | `fragment_id` | 写 | 把碎片「顶」到列表最前 |
| `upgradeByCoin` | `body` | 写 | [未实测] 用秀点升级 |
| `uploadCdnImage` | `file, opts = {}` | 写 | [未实测] 通过 CDN 通道上传图片文件 |
| `uploadCdnToken` | `{ upload_type = 'image', team_id, watermark } = {}` | 写 | 取 CDN 直传凭证（大文件走这条路：token → COS 直传 → cosobj 登记） |
| `uploadImageBase64` | `data, filename, { team_id, dataUri = true, mime } = {}` | 写 | 以 base64 上传一张图片到图库（最简上传路径，无需 COS 签名） |
| `uploadImageFile` | `file, { team_id } = {}` | 写 | [未实测] 上传图片（multipart 文件形态，区别于 uploadImageBase64） |
| `uploadSvgContent` | `body` | 写 | [未实测] 上传 SVG 内容 |
| `uploadVideoFile` | `file, { team_id } = {}` | 写 | [未实测] 上传视频 |
| `verifyHtmlCode` | `body` | 写 | [未实测] HTML 代码校验（编辑器自定义 HTML 组件用） |
| `withdrawCash` | `body` | 写 · 资金 | [未实测] 提现 |
| `wxArticleData` | `articleurl` | 写 | 通过公众号文章 URL 抓取正文结构（返回结构化的文章数据） |

