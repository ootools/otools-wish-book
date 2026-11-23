# 心愿存折（otools-wish-book）

粉色拟物风格的 OTools Panel 独立插件。一个孩子 = 一份存折，每份存折包含多页；默认只有一个孩子「子涵」。星星按页累计，心愿礼物清单全局独立，兑换时从当前孩子存折的当前页扣除星星并盖上朱红「已兑换」章。

## 功能

- 封面 / 集星页 / 多孩设置 / 奖励星星 / 心愿礼物 / 兑换券六块界面，默认面板 800×600。
- 圆形凹槽网格 8×4，金星渐变立体、已兑换星去饱和盖朱红章；顶部装订打孔；SVG 矢量插画，无 emoji 图标。
- 奖励星星支持 1/3/5 颗与快捷原因；星星从按钮飞出、旋转放大、啪嗒贴槽、弹跳金光（620ms）。
- 多孩各自一份存折、存折内可翻页/加页/删页；每页独立计数，礼物清单不属于任何孩子或页，翻页/切换孩子不变化，只在兑换时扣当前页星星。旧版「一个孩子一页」的存档会自动迁移为该孩子存折的第一页。
- **双存储模式**：默认「本机」模式，不请求身份接口、不需要登录，数据存宿主本地文件 `~/.otools/local/otools-wish-book/`；封面可切到「云端」模式，此时才需要登录，数据存 xycloud 独立业务模块 `wishbook`（`/wishbook/book/data`，表 `xy_wishbook_data`）。两种模式的存档互相独立，模式选择也存宿主文件，跨重启保持；首次切到云端且云端无存档时，把当前本机数据上传。
- 云端模式下宿主未登录会弹窗，点「去设置登录」自动打开宿主设置 → 账号页，登录后回到插件自动续跑；也可点「改用本机」退回免登录模式。云端返回 401 时自动续期令牌并重试，续期失败才弹窗。

## 登录与身份（仅云端模式，复用 uTools 兼容开放接口）

插件前端**拿不到原始 JWT，也拿不到原用户 uid**：

1. 插件调用 uTools 同款 `window.otools.fetchUserServerTemporaryToken()`（无参数）。宿主在注入层隐藏传入 packid，主窗口用登录态向 xycloud `POST /api/v1/otools/open/temporary-token` 换 `{token, expireIn, openid, nickname, avatar}`。
2. `token` 就是 uTools 服务端 API 里的 `accessToken`。插件服务端仍按原样做 HMAC 签名调 `GET /otools/open/baseinfo`，拿到的 `open_id = HMAC-SHA256(uid|packid, clientSecret)`，不再等于 uid。
3. 官方插件的 `baseinfo` 签名响应里额外带 `uid`；第三方没有该字段。packid 来自令牌记录，插件服务端无法自己指定。
4. 业务数据读写 `POST /wishbook/book/data` 只带 `accessToken`，uid/packid 由服务端从令牌记录解析，请求方无法伪造；该接口与数据表属于独立业务模块 `wishbook`，不在 `otools` 平台模块里。

宿主侧需要 OTools 主仓包含 apiVersion 6 的 uTools 兼容运行时与令牌事件桥，其中 `window.otools.openLoginSettings()` 发 `otools-open-login-settings-request`，主窗口收到后切到设置页用户标签。老宿主回落到 `getAuthCode()`；没有跳转 API 时插件只提示手动打开设置，不影响主体逻辑。

## xycloud 部署

**身份（平台模块）** `xystack/back-end/xycloud/app/_app/otools/`：

- `controller/Open.php`：`temporary-token` / `baseinfo` / `user/login`，uTools 形状不变，补 packid 与官方 uid 返回。
- `service/PluginIdentity.php`：packid 作用域、openid 派生、官方标记判定。
- `service/PluginAccessToken.php`：**平台公共服务**，从 accessToken 解析 uid/packid，所有业务模块共用；不接触宿主 JWT。
- `install/2026-11-23-otools-identity.sql`：仅给 `xy_otools_temp_token` 补 `packid` 列。

**业务（独立模块）** `xystack/back-end/xycloud/app/_app/wishbook/`：

- `controller/Book.php`：`POST /wishbook/book/data`，调用 otools 的 `PluginAccessToken` 解析 uid/packid 后读写。
- `service/BookData.php` + `install/2026-11-23-wishbook-data.sql`：自有表 `xy_wishbook_data`，唯一键 `(cloudId, packid, uid, dataKey)`。
- `install/install.json`、`docs/API.md`、`tests/book_smoke.php`。

上线步骤：

1. 安装 `wishbook` 模块，执行其 `install/2026-11-23-wishbook-data.sql` 建新表（可重复执行）。
2. `xy_otools_temp_token.packid` 列已由旧版 SQL 补过，无需再执行 otools 的 `2026-11-23-otools-identity.sql`；旧的 `xy_otools_identity_data` 表为空，可忽略。
3. 在 otools 模块配置里配置 `clientId` / `clientSecret`（已有 OTools 开放平台配置即可复用）。
4. 在 `xy_otools_plugin` 把本插件记录设为 `official=1, state=2, status=1`，否则 `baseinfo` 不会返回 uid。
5. 清 `menuItems/pathmap` 缓存，让 `/wishbook/book/data` 注册进路由。

## 本地开发

```bash
npm install
npm run dev        # http://127.0.0.1:6592
npm run build      # vue-tsc + vite build -> dist/
npm run pack       # 生成 dist-pack/*.oplg 并校验
node scripts/make-preview.mjs   # 生成可直接在浏览器打开的 preview.html（mock 宿主与 mock 云接口）
```

`preview.html` 只在本地视觉走查时用，不进发布包，已加入 `.gitignore`。
