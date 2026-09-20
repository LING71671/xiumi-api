# 字段字典

> 来源：真实流量中的响应样本 + 请求 query/body 反推。共 **649** 条。
> 命名规则：`RESP …` 为响应字段，`QUERY …` 为 URL 查询参数，`BODY …` 为请求体字段。

## 响应字段（按接口）


### `BODY  POST`

- `BODY  POST /api/assets/type/image/tagsorder · order` — body
- `BODY  POST /api/fragments/v5/booklet/page/tagsorder · order` — body
- `BODY  POST /api/fragments/v5/paper/comp/tagsorder · order` — body
- `BODY  POST /api/show_goods_favorite_tags/paper/order · order` — body
- `BODY  POST /api/user_home/tag/order · order` — body

### `QUERY GET /api/auth/login-captcha`

- `QUERY GET /api/auth/login-captcha ? area_code` — query
- `QUERY GET /api/auth/login-captcha ? username` — query

### `QUERY GET /api/contacts/list`

- `QUERY GET /api/contacts/list ? limit` — query
- `QUERY GET /api/contacts/list ? reverse` — query

### `QUERY GET /api/help/recommended`

- `QUERY GET /api/help/recommended ? type` — query

### `QUERY GET /api/invoices/available`

- `QUERY GET /api/invoices/available ? include` — query

### `QUERY GET /api/messages`

- `QUERY GET /api/messages ? limit` — query
- `QUERY GET /api/messages ? page` — query
- `QUERY GET /api/messages ? state` — query

### `QUERY GET /api/orders`

- `QUERY GET /api/orders ? limit` — query
- `QUERY GET /api/orders ? offset` — query

### `QUERY GET /api/publisher/identity`

- `QUERY GET /api/publisher/identity ? team_id` — query

### `QUERY GET /api/show_goods_favorites`

- `QUERY GET /api/show_goods_favorites ? limit` — query
- `QUERY GET /api/show_goods_favorites ? page` — query
- `QUERY GET /api/show_goods_favorites ? search` — query
- `QUERY GET /api/show_goods_favorites ? show_type` — query

### `QUERY GET /api/show_goods/goodses`

- `QUERY GET /api/show_goods/goodses ? by_nearest` — query
- `QUERY GET /api/show_goods/goodses ? limit` — query
- `QUERY GET /api/show_goods/goodses ? page` — query
- `QUERY GET /api/show_goods/goodses ? price_scope` — query
- `QUERY GET /api/show_goods/goodses ? search` — query
- `QUERY GET /api/show_goods/goodses ? show_type` — query
- `QUERY GET /api/show_goods/goodses ? showgoods_type` — query
- `QUERY GET /api/show_goods/goodses ? tag_id` — query
- `QUERY GET /api/show_goods/goodses ? tag_name` — query
- `QUERY GET /api/show_goods/goodses ? tpl_flag` — query

### `QUERY GET /api/show_goods/my/incomes/goodses`

- `QUERY GET /api/show_goods/my/incomes/goodses ? limit` — query
- `QUERY GET /api/show_goods/my/incomes/goodses ? page` — query
- `QUERY GET /api/show_goods/my/incomes/goodses ? payedOnly` — query
- `QUERY GET /api/show_goods/my/incomes/goodses ? scopeType` — query
- `QUERY GET /api/show_goods/my/incomes/goodses ? state` — query

### `QUERY GET /api/show_goods/my/purchased/goodses`

- `QUERY GET /api/show_goods/my/purchased/goodses ? limit` — query
- `QUERY GET /api/show_goods/my/purchased/goodses ? page` — query
- `QUERY GET /api/show_goods/my/purchased/goodses ? show_type` — query

### `QUERY GET /api/show_goods/tags_tree`

- `QUERY GET /api/show_goods/tags_tree ? show_goods` — query
- `QUERY GET /api/show_goods/tags_tree ? show_type` — query
- `QUERY GET /api/show_goods/tags_tree ? tag_level_from` — query
- `QUERY GET /api/show_goods/tags_tree ? tag_level_to` — query

### `QUERY GET /api/shows/count`

- `QUERY GET /api/shows/count ? show_type` — query
- `QUERY GET /api/shows/count ? version` — query

### `QUERY GET /api/shows/deleted/shows`

- `QUERY GET /api/shows/deleted/shows ? limit` — query
- `QUERY GET /api/shows/deleted/shows ? page` — query
- `QUERY GET /api/shows/deleted/shows ? show_type` — query
- `QUERY GET /api/shows/deleted/shows ? version` — query

### `QUERY GET /api/templates`

- `QUERY GET /api/templates ? limit` — query
- `QUERY GET /api/templates ? match_level` — query
- `QUERY GET /api/templates ? page` — query
- `QUERY GET /api/templates ? q` — query
- `QUERY GET /api/templates ? sort` — query
- `QUERY GET /api/templates ? tag_category` — query
- `QUERY GET /api/templates ? tag_ids` — query
- `QUERY GET /api/templates ? template_category` — query

### `QUERY GET /api/templates/items`

- `QUERY GET /api/templates/items ? atom_tpl_id` — query

### `QUERY GET /api/templates/tags_tree`

- `QUERY GET /api/templates/tags_tree ? tag_category` — query
- `QUERY GET /api/templates/tags_tree ? tag_level_from` — query
- `QUERY GET /api/templates/tags_tree ? tag_level_to` — query
- `QUERY GET /api/templates/tags_tree ? template` — query

### `QUERY GET /api/user_home/published/user/{hash}/exhibits/on_mypage`

- `QUERY GET /api/user_home/published/user/{hash}/exhibits/on_mypage ? limit` — query
- `QUERY GET /api/user_home/published/user/{hash}/exhibits/on_mypage ? page` — query

### `QUERY GET /api/user/info`

- `QUERY GET /api/user/info ? include` — query

### `QUERY GET /api/wallet/bills`

- `QUERY GET /api/wallet/bills ? limit` — query
- `QUERY GET /api/wallet/bills ? page` — query

### `RESP GET /api/apikey`

- `data` — object
- `data.apiKeys` — array
- `data.availableCount` — number — 示例 `2`
- `data.capability` — object
- `data.capability.message` — string — 示例 `您的 API Key 功能已被管理员禁用`
- `data.capability.prohibited` — boolean — 示例 `true`
- `data.currentCount` — number — 示例 `0`
- `data.totalCount` — number — 示例 `2`

### `RESP GET /api/auth/login-captcha`

- `data` — boolean — 示例 `false`

### `RESP GET /api/auth/partner/ownerpartnerapp`

- `data` — array

### `RESP GET /api/auth/partner/partnerappbindlist`

- `data` — object
- `data.BIND_PARTNER_DOCUMENT_SERVICE` — object
- `data.BIND_PARTNER_DOCUMENT_SERVICE.sendArticleUrl` — string — 示例 `https://xmapi.xiumi.us/article/postpartn`
- `data.BIND_PARTNER_DOCUMENT_SERVICE.sendAssetUrl` — string — 示例 `https://xmapi.xiumi.us/resource/postpart`
- `data.BIND_PARTNER_DOCUMENT_SERVICE.taurusLoginApi` — string — 示例 `https://xmapi.xiumi.us/user/login`
- `data.binds` — array

### `RESP GET /api/contacts/list`

- `data` — array

### `RESP GET /api/help/recommended`

- `data` — array
- `data.[]` — object
- `data.[].created_at` — string — 示例 `2019-07-29T02:15:00.000Z`
- `data.[].recommended_help_id` — number — 示例 `3`
- `data.[].title` — string — 示例 `快捷键`
- `data.[].type` — number — 示例 `2`
- `data.[].type_text` — string — 示例 `article`
- `data.[].updated_at` — string — 示例 `2019-08-14T02:10:44.000Z`
- `data.[].URL` — string — 示例 `https://v.xiumi.us/board/v5/2a5va/169791`

### `RESP GET /api/home_slogans`

- `data` — array
- `data.[]` — object
- `data.[].bg_color` — string — 示例 ``
- `data.[].bg_uri` — string — 示例 ``
- `data.[].created_at` — string — 示例 `2017-08-30T10:55:41.000Z`
- `data.[].slogan_id` — number — 示例 `42`
- `data.[].state` — number — 示例 `1`
- `data.[].target_uri` — string — 示例 `https://v.xiumi.us/board/v5/2a5va/390085`
- `data.[].thumb_uri` — string — 示例 `//statics.xiumi.us/stc/images/slogan/pra`
- `data.[].updated_at` — string — 示例 `2017-08-30T10:55:46.000Z`

### `RESP GET /api/invoices/available`

- `data` — object
- `data.available_invoice` — number — 示例 `0`
- `data.min_invoice` — number — 示例 `0.01`
- `data.total_paid` — null — 示例 `null`

### `RESP GET /api/invoices/count`

- `data` — number — 示例 `0`

### `RESP GET /api/invoices/lastinvoice`

- `data` — null — 示例 `null`

### `RESP GET /api/messages`

- `data` — array

### `RESP GET /api/messages/settings/`

- `data` — object
- `data.mute_be_saved_to` — number — 示例 `0`
- `data.mute_invitation` — number — 示例 `0`
- `data.mute_new_show` — number — 示例 `0`
- `data.user_id` — number — 示例 `28745337`

### `RESP GET /api/messages/status`

- `data` — object
- `data.importanCount` — number — 示例 `0`
- `data.totalCount` — number — 示例 `0`
- `data.unreadCount` — number — 示例 `0`

### `RESP GET /api/notify`

- `data` — null — 示例 `null`

### `RESP GET /api/orders`

- `data` — object
- `data.count` — number — 示例 `0`
- `data.orders` — array

### `RESP GET /api/orders/tariff/for/level/upgrading`

- `data` — object
- `data.payment_list` — array
- `data.payment_list[]` — object
- `data.payment_list[].amount` — number — 示例 `10`
- `data.payment_list[].api` — string — 示例 `/api/orders/for/level_upgrading`
- `data.payment_list[].level` — number — 示例 `4`
- `data.payment_list[].remainLife` — number — 示例 `30`
- `data.target_user` — object
- `data.target_user.agreement_access` — number — 示例 `1`
- `data.target_user.area_code` — number — 示例 `86`
- `data.target_user.avatar_url` — null — 示例 `null`
- `data.target_user.brand_name` — null — 示例 `null`
- `data.target_user.email` — null — 示例 `null`
- `data.target_user.hasPassword` — boolean — 示例 `true`
- `data.target_user.isBindApple` — boolean — 示例 `false`
- `data.target_user.isBindQQ` — boolean — 示例 `true`
- `data.target_user.isBindWeibo` — boolean — 示例 `false`
- `data.target_user.isBindWx` — boolean — 示例 `false`
- `data.target_user.level` — number — 示例 `1`
- `data.target_user.level_remain_life` — number — 示例 `0`
- `data.target_user.levelLimit` — object
- `data.target_user.levelLimit.articleLimit` — number — 示例 `30`
- `data.target_user.levelLimit.articlePageLimit` — number — 示例 `1000`
- `data.target_user.levelLimit.formDataCountLimit` — number — 示例 `100`
- `data.target_user.levelLimit.fragmentLimit` — number — 示例 `100`
- `data.target_user.levelLimit.showLimit` — number — 示例 `30`
- `data.target_user.levelLimit.showPageLimit` — number — 示例 `300`
- `data.target_user.levelLimit.teamCountLimit` — number — 示例 `1`
- `data.target_user.levelLimit.teamMemCountLimit` — number — 示例 `10`
- `data.target_user.levelLimit.upAudioNumLimit` — number — 示例 `10`
- `data.target_user.levelLimit.upAudioSizeLimit` — number — 示例 `10485760`
- `data.target_user.levelLimit.upImageNumLimit` — number — 示例 `100`
- `data.target_user.levelLimit.upImageSizeLimit` — number — 示例 `10485760`
- `data.target_user.levelLimit.upVideoNumLimit` — number — 示例 `10`
- `data.target_user.levelLimit.upVideoSizeLimit` — number — 示例 `20971520`
- `data.target_user.levelLimit.version` — number — 示例 `1`
- `data.target_user.location` — string — 示例 `示例地区`
- `data.target_user.nickname` — string — 示例 `示例用户24e4`
- `data.target_user.partner_uid` — null — 示例 `null`
- `data.target_user.phone` — string — 示例 `13800000000`
- `data.target_user.qq_qd_uin` — null — 示例 `null`
- `data.target_user.sub_account` — number — 示例 `0`
- `data.target_user.unique_uid` — string — 示例 `0123456789abcdef0123456789abcdef`
- `data.target_user.user_sid` — string — 示例 `l0TvI`
- `data.target_user.userpage_url` — string — 示例 `https://v.xiumius.cn/u/l0TvI`

### `RESP GET /api/orders/tariff/for/templated_membership/upgrading`

- `data` — object
- `data.payment_list` — array
- `data.payment_list[]` — object
- `data.payment_list[].amount` — number — 示例 `20`
- `data.payment_list[].api` — string — 示例 `/api/orders/for/templated_membership`
- `data.payment_list[].level` — string — 示例 `1m`
- `data.payment_list[].remainLife` — number — 示例 `30`
- `data.target_user` — object
- `data.target_user.agreement_access` — number — 示例 `1`
- `data.target_user.area_code` — number — 示例 `86`
- `data.target_user.avatar_url` — null — 示例 `null`
- `data.target_user.brand_name` — null — 示例 `null`
- `data.target_user.email` — null — 示例 `null`
- `data.target_user.hasPassword` — boolean — 示例 `true`
- `data.target_user.isBindApple` — boolean — 示例 `false`
- `data.target_user.isBindQQ` — boolean — 示例 `true`
- `data.target_user.isBindWeibo` — boolean — 示例 `false`
- `data.target_user.isBindWx` — boolean — 示例 `false`
- `data.target_user.level` — number — 示例 `1`
- `data.target_user.level_remain_life` — number — 示例 `0`
- `data.target_user.levelLimit` — object
- `data.target_user.levelLimit.articleLimit` — number — 示例 `30`
- `data.target_user.levelLimit.articlePageLimit` — number — 示例 `1000`
- `data.target_user.levelLimit.formDataCountLimit` — number — 示例 `100`
- `data.target_user.levelLimit.fragmentLimit` — number — 示例 `100`
- `data.target_user.levelLimit.showLimit` — number — 示例 `30`
- `data.target_user.levelLimit.showPageLimit` — number — 示例 `300`
- `data.target_user.levelLimit.teamCountLimit` — number — 示例 `1`
- `data.target_user.levelLimit.teamMemCountLimit` — number — 示例 `10`
- `data.target_user.levelLimit.upAudioNumLimit` — number — 示例 `10`
- `data.target_user.levelLimit.upAudioSizeLimit` — number — 示例 `10485760`
- `data.target_user.levelLimit.upImageNumLimit` — number — 示例 `100`
- `data.target_user.levelLimit.upImageSizeLimit` — number — 示例 `10485760`
- `data.target_user.levelLimit.upVideoNumLimit` — number — 示例 `10`
- `data.target_user.levelLimit.upVideoSizeLimit` — number — 示例 `20971520`
- `data.target_user.levelLimit.version` — number — 示例 `1`
- `data.target_user.location` — string — 示例 `示例地区`
- `data.target_user.nickname` — string — 示例 `示例用户24e4`
- `data.target_user.partner_uid` — null — 示例 `null`
- `data.target_user.phone` — string — 示例 `13800000000`
- `data.target_user.qq_qd_uin` — null — 示例 `null`
- `data.target_user.sub_account` — number — 示例 `0`
- `data.target_user.unique_uid` — string — 示例 `0123456789abcdef0123456789abcdef`
- `data.target_user.user_sid` — string — 示例 `l0TvI`
- `data.target_user.userpage_url` — string — 示例 `https://v.xiumius.cn/u/l0TvI`

### `RESP GET /api/orders/tariff/for/traffic_package`

- `data` — object
- `data.payment_list` — array
- `data.payment_list[]` — object
- `data.payment_list[].allow` — boolean — 示例 `true`
- `data.payment_list[].amount` — number — 示例 `5`
- `data.payment_list[].api` — string — 示例 `/api/orders/for/traffic_package`
- `data.payment_list[].level` — null — 示例 `null`
- `data.payment_list[].remainLife` — number — 示例 `1000`
- `data.target_user` — object
- `data.target_user.agreement_access` — number — 示例 `1`
- `data.target_user.area_code` — number — 示例 `86`
- `data.target_user.avatar_url` — null — 示例 `null`
- `data.target_user.brand_name` — null — 示例 `null`
- `data.target_user.email` — null — 示例 `null`
- `data.target_user.hasPassword` — boolean — 示例 `true`
- `data.target_user.isBindApple` — boolean — 示例 `false`
- `data.target_user.isBindQQ` — boolean — 示例 `true`
- `data.target_user.isBindWeibo` — boolean — 示例 `false`
- `data.target_user.isBindWx` — boolean — 示例 `false`
- `data.target_user.level` — number — 示例 `1`
- `data.target_user.level_remain_life` — number — 示例 `0`
- `data.target_user.levelLimit` — object
- `data.target_user.levelLimit.articleLimit` — number — 示例 `30`
- `data.target_user.levelLimit.articlePageLimit` — number — 示例 `1000`
- `data.target_user.levelLimit.formDataCountLimit` — number — 示例 `100`
- `data.target_user.levelLimit.fragmentLimit` — number — 示例 `100`
- `data.target_user.levelLimit.showLimit` — number — 示例 `30`
- `data.target_user.levelLimit.showPageLimit` — number — 示例 `300`
- `data.target_user.levelLimit.teamCountLimit` — number — 示例 `1`
- `data.target_user.levelLimit.teamMemCountLimit` — number — 示例 `10`
- `data.target_user.levelLimit.upAudioNumLimit` — number — 示例 `10`
- `data.target_user.levelLimit.upAudioSizeLimit` — number — 示例 `10485760`
- `data.target_user.levelLimit.upImageNumLimit` — number — 示例 `100`
- `data.target_user.levelLimit.upImageSizeLimit` — number — 示例 `10485760`
- `data.target_user.levelLimit.upVideoNumLimit` — number — 示例 `10`
- `data.target_user.levelLimit.upVideoSizeLimit` — number — 示例 `20971520`
- `data.target_user.levelLimit.version` — number — 示例 `1`
- `data.target_user.location` — string — 示例 `示例地区`
- `data.target_user.nickname` — string — 示例 `示例用户24e4`
- `data.target_user.partner_uid` — null — 示例 `null`
- `data.target_user.phone` — string — 示例 `13800000000`
- `data.target_user.qq_qd_uin` — null — 示例 `null`
- `data.target_user.sub_account` — number — 示例 `0`
- `data.target_user.unique_uid` — string — 示例 `0123456789abcdef0123456789abcdef`
- `data.target_user.user_sid` — string — 示例 `l0TvI`
- `data.target_user.userpage_url` — string — 示例 `https://v.xiumius.cn/u/l0TvI`

### `RESP GET /api/show_goods_favorite_tags/paper/tagorder`

- `data` — object
- `data.tags` — array
- `data.tagsOrder` — null — 示例 `null`

### `RESP GET /api/show_goods_favorites`

- `data` — object
- `data.count` — number — 示例 `0`
- `data.goodses` — array

### `RESP GET /api/show_goods/author/state`

- `data` — object
- `data.state` — string — 示例 `never-apply`

### `RESP GET /api/show_goods/goodses`

- `data` — object
- `data.count` — number — 示例 `96453`
- `data.goodses` — array
- `data.goodses[]` — object
- `data.goodses[].allowApplyChange` — boolean — 示例 `true`
- `data.goodses[].collected_number` — number — 示例 `172`
- `data.goodses[].copy_number` — number — 示例 `67`
- `data.goodses[].created_at` — string — 示例 `2026-09-18T08:52:04.000Z`
- `data.goodses[].free_copy_number` — number — 示例 `0`
- `data.goodses[].price` — number — 示例 `10`
- `data.goodses[].priority` — number — 示例 `0`
- `data.goodses[].seller` — object
- `data.goodses[].seller.avatar_url` — null — 示例 `null`
- `data.goodses[].seller.brand_name` — null — 示例 `null`
- `data.goodses[].seller.level` — number — 示例 `3`
- `data.goodses[].seller.location` — string — 示例 `示例地区`
- `data.goodses[].seller.nickname` — string — 示例 `示例用户90fe`
- `data.goodses[].seller.sub_account` — number — 示例 `0`
- `data.goodses[].seller.unique_uid` — string — 示例 `bb11cc22dd33ee44ff55667788990011`
- `data.goodses[].seller.user_sid` — string — 示例 `KMfsh`
- `data.goodses[].seller.userpage_url` — string — 示例 `https://v.xiumius.cn/u/KMfsh`
- `data.goodses[].show` — object
- `data.goodses[].show_goods_id` — number — 示例 `159063`
- `data.goodses[].show_id` — number — 示例 `726575728`
- `data.goodses[].show_type` — number — 示例 `2`
- `data.goodses[].show.cover` — string — 示例 `//img.xiumi.us/xmi/ua/tTTlJ/i/f939fa3d56`
- `data.goodses[].show.created_at` — string — 示例 `2026-09-18T08:52:03.000Z`
- `data.goodses[].show.cur_hits` — number — 示例 `2311`
- `data.goodses[].show.desc` — string — 示例 `中秋国庆放假通知校园卡通`
- `data.goodses[].show.edit_url` — string — 示例 `/studio/v5#/paper/for/726575728`
- `data.goodses[].show.exif` — object
- `data.goodses[].show.exif.canvasInformation` — object
- `data.goodses[].show.exif.viewport` — object
- `data.goodses[].show.exif.viewport.FONT_SIZE` — number — 示例 `16`
- `data.goodses[].show.exif.viewport.STAGE_SIZE` — string — 示例 `flow_scroll`
- `data.goodses[].show.exif.viewport.WIDTH` — number — 示例 `415`
- `data.goodses[].show.history_hits` — number — 示例 `1814`
- `data.goodses[].show.hit_count` — number — 示例 `4125`
- `data.goodses[].show.loading_icon` — null — 示例 `null`
- `data.goodses[].show.mask_no_modification` — number — 示例 `0`
- `data.goodses[].show.mask_on_locking` — number — 示例 `0`
- `data.goodses[].show.mask_pattern_fragment` — number — 示例 `5`
- `data.goodses[].show.pattern_fragment_texts` — array
- `data.goodses[].show.pattern_fragment_texts[]` — string — 示例 `pattern`
- `data.goodses[].show.points` — number — 示例 `0`
- `data.goodses[].show.release_applied_at` — null — 示例 `null`
- `data.goodses[].show.release_at` — string — 示例 `2026-09-18T08:52:03.000Z`
- `data.goodses[].show.right_access_privilege` — number — 示例 `1`
- `data.goodses[].show.right_form_closed` — number — 示例 `0`
- `data.goodses[].show.right_freeshow` — number — 示例 `1`
- `data.goodses[].show.right_no_advert` — number — 示例 `0`
- `data.goodses[].show.right_vip_host` — number — 示例 `1`
- `data.goodses[].show.saved_at` — string — 示例 `2026-09-18T08:52:03.000Z`
- `data.goodses[].show.show_id` — number — 示例 `726575728`
- `data.goodses[].show.show_url` — string — 示例 `https://v.xiumius.cn/board/v5/VuWGi/7265`
- `data.goodses[].show.title` — string — 示例 `国庆节|中秋国庆放假通知|中秋节|校园|幼儿园|红色`
- `data.goodses[].show.traffic` — number — 示例 `0`
- `data.goodses[].show.type` — number — 示例 `2`
- `data.goodses[].show.type_text` — string — 示例 `paper`
- `data.goodses[].show.updated_at` — string — 示例 `2026-09-19T19:38:47.000Z`
- `data.goodses[].show.usage_scenario` — null — 示例 `null`
- `data.goodses[].show.version` — number — 示例 `5`
- `data.goodses[].show.wechat_no_share` — number — 示例 `0`
- `data.goodses[].state` — number — 示例 `0`
- `data.goodses[].state_text` — string — 示例 `on_sale`
- `data.goodses[].template_membership_flag` — number — 示例 `0`
- `data.goodses[].tpl_copy_number` — number — 示例 `0`
- `data.goodses[].updated_at` — string — 示例 `2026-09-20T12:57:52.000Z`
- `data.goodses[].waitingDays` — number — 示例 `0`
- `data.goodses[].weight` — number — 示例 `824676`

### `RESP GET /api/show_goods/my/incomes/goodses`

- `data` — object
- `data.count` — number — 示例 `0`
- `data.goodses` — array
- `data.recentDay` — null — 示例 `null`

### `RESP GET /api/show_goods/my/purchased/goodses`

- `data` — object
- `data.count` — number — 示例 `0`
- `data.goodses` — array

### `RESP GET /api/show_goods/tags_tree`

- `data` — array
- `data.[]` — object
- `data.[].childTags` — array
- `data.[].childTags[]` — object
- `data.[].childTags[].childTags` — array
- `data.[].childTags[].childTags[]` — object
- `data.[].childTags[].childTags[].created_at` — string — 示例 `2018-04-26T22:59:56.000Z`
- `data.[].childTags[].childTags[].show_type` — number — 示例 `2`
- `data.[].childTags[].childTags[].show_type_text` — string — 示例 `paper`
- `data.[].childTags[].childTags[].tag_id` — number — 示例 `92`
- `data.[].childTags[].childTags[].tag_level` — number — 示例 `0`
- `data.[].childTags[].childTags[].tag_name` — string — 示例 `邀请函`
- `data.[].childTags[].childTags[].updated_at` — string — 示例 `2018-04-26T22:59:56.000Z`
- `data.[].childTags[].created_at` — string — 示例 `2018-04-24T02:16:12.000Z`
- `data.[].childTags[].show_type` — number — 示例 `2`
- `data.[].childTags[].show_type_text` — string — 示例 `paper`
- `data.[].childTags[].tag_id` — number — 示例 `12`
- `data.[].childTags[].tag_level` — number — 示例 `1`
- `data.[].childTags[].tag_name` — string — 示例 `用途`
- `data.[].childTags[].updated_at` — string — 示例 `2018-04-24T02:16:12.000Z`
- `data.[].created_at` — string — 示例 `2018-04-20T14:15:49.000Z`
- `data.[].show_type` — number — 示例 `2`
- `data.[].show_type_text` — string — 示例 `paper`
- `data.[].tag_id` — number — 示例 `1`
- `data.[].tag_level` — number — 示例 `2`
- `data.[].tag_name` — string — 示例 `paper_root`
- `data.[].updated_at` — string — 示例 `2018-04-20T14:15:51.000Z`

### `RESP GET /api/show_goods/tpl_goods/count`

- `data` — number — 示例 `0`

### `RESP GET /api/shows/count`

- `data` — number — 示例 `0`

### `RESP GET /api/shows/deleted/shows`

- `data` — object
- `data.count` — number — 示例 `0`
- `data.deletedShows` — array

### `RESP GET /api/sys_info`

- `data` — object
- `data.assetUpload` — object
- `data.assetUpload.cdnHost` — string — 示例 `https://upload.xiumius.cn`
- `data.assetUpload.configs` — array
- `data.assetUpload.configs[]` — string — 示例 `cdn`
- `data.BIND_PARTNER_DOCUMENT_SERVICE` — object
- `data.BIND_PARTNER_DOCUMENT_SERVICE.sendArticleUrl` — string — 示例 `https://xmapi.xiumi.us/article/postpartn`
- `data.BIND_PARTNER_DOCUMENT_SERVICE.sendAssetUrl` — string — 示例 `https://xmapi.xiumi.us/resource/postpart`
- `data.BIND_PARTNER_DOCUMENT_SERVICE.taurusLoginApi` — string — 示例 `https://xmapi.xiumi.us/user/login`
- `data.browserExtension` — object
- `data.browserExtension.version` — string — 示例 `0.0.7`
- `data.cashWithdraw` — object
- `data.cashWithdraw.brokerageRate` — number — 示例 `0.16`
- `data.cashWithdraw.minAmount` — number — 示例 `10`
- `data.cashWithdraw.taxRate` — number — 示例 `0`
- `data.DOCUMENT_SERVICE` — object
- `data.DOCUMENT_SERVICE.cancelWxArticleSendUrl` — string — 示例 `//wx.xiumius.cn/articlesentrecord/cancel`
- `data.DOCUMENT_SERVICE.deleteResoucesUrl` — string — 示例 `//wx.xiumius.cn/resource/deleteresouces`
- `data.DOCUMENT_SERVICE.deleteWxArticleUrl` — string — 示例 `//wx.xiumius.cn/article/deletearticles`
- `data.DOCUMENT_SERVICE.fetchUserListApi` — string — 示例 `//wx.xiumius.cn/authorization/authlist`
- `data.DOCUMENT_SERVICE.geminiLoginApi` — string — 示例 `//wx.xiumius.cn/user/login`
- `data.DOCUMENT_SERVICE.geminiTokenApi` — string — 示例 `//wx.xiumius.cn/user/token`
- `data.DOCUMENT_SERVICE.refreshUserListApi` — string — 示例 `//wx.xiumius.cn/authorization/authlistre`
- `data.DOCUMENT_SERVICE.removeUserApi` — string — 示例 `//wx.xiumius.cn/authorization/removeauth`
- `data.DOCUMENT_SERVICE.sendArticleUrl` — string — 示例 `//wx.xiumius.cn/article/postarticles`
- `data.DOCUMENT_SERVICE.sendAssetUrl` — string — 示例 `//wx.xiumius.cn/resource/postresource`
- `data.DOCUMENT_SERVICE.sendPreviewApi` — string — 示例 `//wx.xiumius.cn/article/previewarticle`
- `data.DOCUMENT_SERVICE.sendWxArticlesUrl` — string — 示例 `//wx.xiumius.cn/article/sendarticlestoal`
- `data.DOCUMENT_SERVICE.wxArticleSentRecordUrl` — string — 示例 `//wx.xiumius.cn/articlesentrecord/list`
- `data.DOCUMENT_SERVICE.wxauthArticleDataUrl` — string — 示例 `//wx.xiumius.cn/article/weixinarticledat`
- `data.DOCUMENT_SERVICE.wxauthArticlesUrl` — string — 示例 `//wx.xiumius.cn/article/weixinarticles`
- `data.DOCUMENT_SERVICE.wxauthPublishedArticlesUrl` — string — 示例 `//wx.xiumius.cn/article/weixinpublishart`
- `data.node_env` — string — 示例 `production`
- `data.PARTNER_DOCUMENT_SERVICE` — object
- `data.PARTNER_DOCUMENT_SERVICE.importArticleUrl` — string — 示例 `https://xmapi.xiumi.us/article/partnerco`
- `data.PARTNER_DOCUMENT_SERVICE.sendArticleUrl` — string — 示例 `https://xmapi.xiumi.us/article/postartic`
- `data.PARTNER_DOCUMENT_SERVICE.sendAssetUrl` — string — 示例 `https://xmapi.xiumi.us/resource/postreso`
- `data.PARTNER_DOCUMENT_SERVICE.sendShowUrl` — string — 示例 `https://xmapi.xiumi.us/show/postshow`
- `data.psd` — object
- `data.psd.maxFileSize` — number — 示例 `31457280`
- `data.settings` — object
- `data.settings.export` — object
- `data.settings.export.wxCommon` — object
- `data.settings.export.wxCommon.gifSuffix` — null — 示例 `null`
- `data.settings.export.wxCopy` — object
- `data.settings.export.wxCopy.imageSuffix` — string — 示例 `style/xmwx`
- `data.settings.export.wxCopy.maxImageSize` — number — 示例 `2048`
- `data.settings.export.wxSync` — object
- `data.settings.export.wxSync.imageSuffix` — string — 示例 `style/xmwx`
- `data.settings.export.wxSync.maxImageSize` — number — 示例 `1024`
- `data.settings.xover` — object
- `data.settings.xover.version` — string — 示例 `0.0.7`
- `data.version` — string — 示例 `14.4.2`
- `data.webfont` — object
- `data.webfont.yzkWebSDKScriptURI` — string — 示例 `/3rd/yzk-webfont/20200317/h5js.new.min.j`
- `data.webfont.yzkWebSDKServer` — string — 示例 `webfont.xiumius.cn`

### `RESP GET /api/teams`

- `data` — array

### `RESP GET /api/templates`

- `data` — object
- `data.count` — number — 示例 `21640`
- `data.templates` — array
- `data.templates[]` — object
- `data.templates[].accessibility` — number — 示例 `100`
- `data.templates[].accessibility_text` — string — 示例 `Public`
- `data.templates[].atom_tpl_id` — string — 示例 `paper-cp:2026-9-11/53771`
- `data.templates[].category` — number — 示例 `11`
- `data.templates[].category_text` — string — 示例 `paper-cp`
- `data.templates[].created_at` — string — 示例 `2026-09-11T06:56:12.000Z`
- `data.templates[].display_name` — string — 示例 `paper-cp:2026-9-11/53771`
- `data.templates[].feature_requires` — number — 示例 `0`
- `data.templates[].feature_requires_text` — array
- `data.templates[].help_content` — null — 示例 `null`
- `data.templates[].level` — number — 示例 `1`
- `data.templates[].level_remain_life` — number — 示例 `0`
- `data.templates[].matrix` — array
- `data.templates[].matrix[]` — object
- `data.templates[].matrix[]._comp` — object
- `data.templates[].matrix[]._comp._$uuid` — string — 示例 `comp-AoXD3YQ4EWKHqqdn`
- `data.templates[].matrix[]._comp.constraint` — object
- `data.templates[].matrix[]._comp.pose` — object
- `data.templates[].matrix[]._comp.style` — object
- `data.templates[].matrix[]._comp.tplId` — string — 示例 `paper-cp:layout/row1-r1c5`
- `data.templates[].matrix[].col1` — object
- `data.templates[].matrix[].col1.constraint` — object
- `data.templates[].matrix[].col1.items` — array
- `data.templates[].matrix[].col1.style` — object
- `data.templates[].matrix[].col1.type` — string — 示例 `group`
- `data.templates[].matrix[].col2` — object
- `data.templates[].matrix[].col2.constraint` — object
- `data.templates[].matrix[].col2.items` — array
- `data.templates[].matrix[].col2.style` — object
- `data.templates[].matrix[].col2.type` — string — 示例 `group`
- `data.templates[].matrix[].col3` — object
- `data.templates[].matrix[].col3.constraint` — object
- `data.templates[].matrix[].col3.items` — array
- `data.templates[].matrix[].col3.style` — object
- `data.templates[].matrix[].col3.type` — string — 示例 `group`
- `data.templates[].matrix[].col4` — object
- `data.templates[].matrix[].col4.constraint` — object
- `data.templates[].matrix[].col4.items` — array
- `data.templates[].matrix[].col4.style` — object
- `data.templates[].matrix[].col4.type` — string — 示例 `group`
- `data.templates[].matrix[].col5` — object
- `data.templates[].matrix[].col5.constraint` — object
- `data.templates[].matrix[].col5.items` — array
- `data.templates[].matrix[].col5.style` — object
- `data.templates[].matrix[].col5.type` — string — 示例 `group`
- `data.templates[].order_num` — number — 示例 `100`
- `data.templates[].renderer_accelerate` — string — 示例 `<div class="tn-from-house-paper-cp tn-co`
- `data.templates[].tags` — array
- `data.templates[].tags[]` — object
- `data.templates[].tags[].tag_category` — number — 示例 `11`
- `data.templates[].tags[].tag_category_text` — string — 示例 `paper-cp`
- `data.templates[].tags[].tag_id` — number — 示例 `1279`
- `data.templates[].tags[].tag_key` — null — 示例 `null`
- `data.templates[].tags[].tag_level` — number — 示例 `0`
- `data.templates[].tags[].tag_name` — string — 示例 `国庆节`
- `data.templates[].template_id` — number — 示例 `87689`
- `data.templates[].thumb_uri` — null — 示例 `null`
- `data.templates[].updated_at` — string — 示例 `2026-09-17T16:00:00.000Z`
- `data.templates[].version` — number — 示例 `2`
- `data.templates[].visibility` — number — 示例 `100`
- `data.templates[].visibility_text` — string — 示例 `All`

### `RESP GET /api/templates/items`

- `data` — array
- `data.[]` — object
- `data.[].accessibility` — number — 示例 `100`
- `data.[].accessibility_text` — string — 示例 `Public`
- `data.[].atom_tpl_id` — string — 示例 `booklet-cp:baseware/cimg-only`
- `data.[].category` — number — 示例 `1`
- `data.[].category_text` — string — 示例 `booklet-cp`
- `data.[].created_at` — string — 示例 `2015-12-17T07:08:43.000Z`
- `data.[].display_name` — string — 示例 `可裁剪图片`
- `data.[].feature_requires` — number — 示例 `0`
- `data.[].feature_requires_text` — array
- `data.[].help_content` — null — 示例 `null`
- `data.[].level` — number — 示例 `1`
- `data.[].level_remain_life` — number — 示例 `0`
- `data.[].matrix` — object
- `data.[].matrix._comp` — object
- `data.[].matrix._comp.constraint` — object
- `data.[].matrix._comp.constraint.enableFullImage` — boolean — 示例 `true`
- `data.[].matrix._comp.constraint.opMenu` — object
- `data.[].matrix._comp.constraint.opMenu.crop-image-merged` — boolean — 示例 `true`
- `data.[].matrix._comp.constraint.pose` — object
- `data.[].matrix._comp.constraint.pose.aspectRatio` — number — 示例 `1`
- `data.[].matrix._comp.pose` — object
- `data.[].matrix._comp.pose.aspectRatio` — string — 示例 `1.0 origin`
- `data.[].matrix._comp.pose.width` — number — 示例 `150`
- `data.[].matrix._comp.style` — object
- `data.[].matrix._comp.tplId` — string — 示例 `booklet-cp:baseware/cimg-only`
- `data.[].matrix.cimg1` — object
- `data.[].matrix.cimg1.constraint` — object
- `data.[].matrix.cimg1.constraint.changeViewPort` — boolean — 示例 `true`
- `data.[].matrix.cimg1.src` — string — 示例 `//statics.xiumi.us/stc/images/placeholde`
- `data.[].matrix.cimg1.style` — object
- `data.[].matrix.cimg1.style.backgroundPosition` — string — 示例 `center center`
- `data.[].matrix.cimg1.style.backgroundRepeat` — string — 示例 `no-repeat`
- `data.[].matrix.cimg1.style.backgroundSize` — string — 示例 `cover`
- `data.[].matrix.cimg1.type` — string — 示例 `crop-image`
- `data.[].order_num` — number — 示例 `2000`
- `data.[].renderer_accelerate` — string — 示例 `<div class="tn-comp-anim-pin tn-comp tn-`
- `data.[].template_id` — number — 示例 `1`
- `data.[].thumb_uri` — null — 示例 `null`
- `data.[].updated_at` — string — 示例 `2020-07-29T06:25:11.000Z`
- `data.[].version` — number — 示例 `1`
- `data.[].visibility` — number — 示例 `100`
- `data.[].visibility_text` — string — 示例 `All`

### `RESP GET /api/templates/tags_tree`

- `data` — array
- `data.[]` — object
- `data.[].childTags` — array
- `data.[].childTags[]` — object
- `data.[].childTags[].childTags` — array
- `data.[].childTags[].childTags[]` — object
- `data.[].childTags[].childTags[].tag_category` — number — 示例 `11`
- `data.[].childTags[].childTags[].tag_category_text` — string — 示例 `paper-cp`
- `data.[].childTags[].childTags[].tag_id` — number — 示例 `3242`
- `data.[].childTags[].childTags[].tag_level` — number — 示例 `0`
- `data.[].childTags[].childTags[].tag_name` — string — 示例 `基础标题`
- `data.[].childTags[].tag_category` — number — 示例 `11`
- `data.[].childTags[].tag_category_text` — string — 示例 `paper-cp`
- `data.[].childTags[].tag_id` — number — 示例 `3227`
- `data.[].childTags[].tag_level` — number — 示例 `1`
- `data.[].childTags[].tag_name` — string — 示例 `标题`
- `data.[].tag_category` — number — 示例 `11`
- `data.[].tag_category_text` — string — 示例 `paper-cp`
- `data.[].tag_id` — number — 示例 `1`
- `data.[].tag_level` — number — 示例 `2`
- `data.[].tag_name` — string — 示例 `paper-cp_root`

### `RESP GET /api/user_home/published/user/{hash}/exhibits/on_mypage`

- `data` — object
- `data.count` — number — 示例 `0`
- `data.exhibits` — array

### `RESP GET /api/user_home/published/user/{hash}/info`

- `data` — object
- `data.avatar_url` — null — 示例 `null`
- `data.brand_name` — null — 示例 `null`
- `data.level` — number — 示例 `1`
- `data.location` — string — 示例 `示例地区`
- `data.nickname` — string — 示例 `示例用户24e4`
- `data.sub_account` — number — 示例 `0`
- `data.unique_uid` — string — 示例 `0123456789abcdef0123456789abcdef`
- `data.user_sid` — string — 示例 `l0TvI`
- `data.userpage_url` — string — 示例 `https://v.xiumius.cn/u/l0TvI`

### `RESP GET /api/user_home/tag/tagorder/{hash}`

- `data` — object
- `data.tags` — array
- `data.tagsOrder` — null — 示例 `null`

### `RESP GET /api/user/blacklist`

- `data` — object

### `RESP GET /api/user/info`

- `data` — object
- `data.authPhoneNeed` — number — 示例 `0`
- `data.requirePhoneBind` — boolean — 示例 `true`
- `data.user` — object
- `data.user.agreement_access` — number — 示例 `1`
- `data.user.area_code` — number — 示例 `86`
- `data.user.avatar_url` — null — 示例 `null`
- `data.user.brand_name` — null — 示例 `null`
- `data.user.created_at` — string — 示例 `2026-09-20T10:29:26.000Z`
- `data.user.email` — null — 示例 `null`
- `data.user.hasPassword` — boolean — 示例 `true`
- `data.user.isBindApple` — boolean — 示例 `false`
- `data.user.isBindQQ` — boolean — 示例 `true`
- `data.user.isBindWeibo` — boolean — 示例 `false`
- `data.user.isBindWx` — boolean — 示例 `false`
- `data.user.level` — number — 示例 `1`
- `data.user.level_remain_life` — number — 示例 `0`
- `data.user.levelLimit` — object
- `data.user.levelLimit.articleLimit` — number — 示例 `30`
- `data.user.levelLimit.articlePageLimit` — number — 示例 `1000`
- `data.user.levelLimit.formDataCountLimit` — number — 示例 `100`
- `data.user.levelLimit.fragmentLimit` — number — 示例 `100`
- `data.user.levelLimit.showLimit` — number — 示例 `30`
- `data.user.levelLimit.showPageLimit` — number — 示例 `300`
- `data.user.levelLimit.teamCountLimit` — number — 示例 `1`
- `data.user.levelLimit.teamMemCountLimit` — number — 示例 `10`
- `data.user.levelLimit.upAudioNumLimit` — number — 示例 `10`
- `data.user.levelLimit.upAudioSizeLimit` — number — 示例 `10485760`
- `data.user.levelLimit.upImageNumLimit` — number — 示例 `100`
- `data.user.levelLimit.upImageSizeLimit` — number — 示例 `10485760`
- `data.user.levelLimit.upVideoNumLimit` — number — 示例 `10`
- `data.user.levelLimit.upVideoSizeLimit` — number — 示例 `20971520`
- `data.user.levelLimit.version` — number — 示例 `1`
- `data.user.location` — string — 示例 `示例地区`
- `data.user.message_count` — object
- `data.user.message_count.total` — number — 示例 `0`
- `data.user.message_count.unread` — number — 示例 `0`
- `data.user.nickname` — string — 示例 `示例用户24e4`
- `data.user.partner_uid` — null — 示例 `null`
- `data.user.phone` — string — 示例 `13800000000`
- `data.user.qq_qd_uin` — null — 示例 `null`
- `data.user.sub_account` — number — 示例 `0`
- `data.user.unique_uid` — string — 示例 `0123456789abcdef0123456789abcdef`
- `data.user.user_setting` — object
- `data.user.user_sid` — string — 示例 `l0TvI`
- `data.user.userpage_url` — string — 示例 `https://v.xiumius.cn/u/l0TvI`

### `RESP GET /api/user/info/coin`

- `data` — object
- `data.coinCount` — number — 示例 `0`

### `RESP GET /api/user/info/invitation`

- `data` — object
- `data.allowInvitation` — boolean — 示例 `true`
- `data.invitationLink` — string — 示例 `https://xiumi.us/user/invitation/14GE8-8`
- `data.invitedCount` — number — 示例 `0`

### `RESP GET /api/user/template_membership`

- `data` — object
- `data.days` — number — 示例 `0`
- `data.is_member` — boolean — 示例 `false`

### `RESP GET /api/user/traffic_package_info`

- `data` — object
- `data.hasPackage` — boolean — 示例 `false`
- `data.traffic` — number — 示例 `0`

### `RESP GET /api/wallet/bills`

- `data` — object
- `data.count` — number — 示例 `0`
- `data.walletBills` — array

### `RESP GET /api/wallet/my/balance`

- `data` — object
- `data.debt` — number — 示例 `0`
- `data.wallet` — number — 示例 `0`

### `RESP POST /api/assets/type/image/tagsorder`

- `data` — string — 示例 `OK`

### `RESP POST /api/fragments/v5/booklet/page/tagsorder`

- `data` — string — 示例 `OK`

### `RESP POST /api/fragments/v5/paper/comp/tagsorder`

- `data` — string — 示例 `OK`

### `RESP POST /api/show_goods_favorite_tags/paper/order`

- `data` — string — 示例 `Added`

### `RESP POST /api/user_home/tag/order`

- `data` — string — 示例 `Added`
