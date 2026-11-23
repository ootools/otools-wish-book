# 宝宝心愿存折（otools-baby-wish-book）

粉色拟物风格的 OTools Panel 独立插件。一个孩子 = 存折里独立的一页，星星按页累计；心愿礼物清单全局独立，兑换时从当前页扣除星星并盖上朱红「已兑换」章。

## 功能

- 封面 / 集星页 / 多孩设置 / 奖励星星 / 心愿礼物 / 兑换券六块界面，默认面板 800×600。
- 圆形凹槽网格 8×4，金星渐变立体、已兑换星去饱和盖朱红章；顶部装订打孔；SVG 矢量插画，无 emoji 图标。
- 奖励星星支持 1/3/5 颗与快捷原因；星星从按钮飞出、旋转放大、啪嗒贴槽、弹跳金光（620ms）。
- 多孩页独立计数与切页；礼物清单不属于任何页，切页不变化，只在兑换时扣当前页星星。
- 运行数据存在 xycloud，按服务端从令牌记录解析出的 uid + packid 隔离；本地缓存按 openid 命名，不使用 uid 当 key。
- 宿主未登录时弹窗提示，点「去设置登录」自动打开宿主设置 → 账号页，登录后回到插件自动续跑；云端返回 401 时自动续期令牌并重试，续期失败才弹窗。

## 登录与身份（复用 uTools 兼容开放接口）

插件前端**拿不到原始 JWT，也拿不到原用户 uid**：

1. 插件调用 uTools 同款 `window.otools.fetchUserServerTemporaryToken()`（无参数）。宿主在注入层隐藏传入 packid，主窗口用登录态向 xycloud `POST /api/v1/otools/open/temporary-token` 换 `{token, expireIn, openid, nickname, avatar}`。
2. `token` 就是 uTools 服务端 API 里的 `accessToken`。插件服务端仍按原样做 HMAC 签名调 `GET /otools/open/baseinfo`，拿到的 `open_id = HMAC-SHA256(uid|packid, clientSecret)`，不再等于 uid。
3. 官方插件的 `baseinfo` 签名响应里额外带 `uid`；第三方没有该字段。packid 来自令牌记录，插件服务端无法自己指定。
4. 数据读写 `POST /otools/identity/data` 只带 `accessToken`，uid/packid 由服务端从令牌记录解析，请求方无法伪造。

宿主侧需要 OTools 主仓包含 apiVersion 6 的 uTools 兼容运行时与令牌事件桥，其中 `window.otools.openLoginSettings()` 发 `otools-open-login-settings-request`，主窗口收到后切到设置页用户标签。老宿主回落到 `getAuthCode()`；没有跳转 API 时插件只提示手动打开设置，不影响主体逻辑。

## xycloud 部署

后端实现位于 `xystack/back-end/xycloud/app/_app/otools/`：

- `controller/Open.php`：`temporary-token` / `baseinfo` / `user/login`，uTools 形状不变，补 packid 与官方 uid 返回。
- `controller/Identity.php`：仅保留按令牌隔离的 `data` 接口（也兼容旧 sessionToken）。
- `service/PluginIdentity.php`：packid 作用域、openid 派生、官方标记判定。
- `install/2026-11-23-otools-identity.sql`：数据表 + `xy_otools_temp_token.packid` 补列（可重复执行）。
- `tests/plugin_identity_smoke.php`：契约 smoke，`php app/_app/otools/tests/plugin_identity_smoke.php`。

上线步骤：

1. 执行 `install/2026-11-23-otools-identity.sql`，确保 `xy_otools_temp_token` 已存在（原有 OTools 开放平台安装自带）。
2. 在模块配置里配置 `clientId` / `clientSecret`（已有 OTools 开放平台配置即可复用）。
3. 在 `xy_otools_plugin` 把本插件记录设为 `official=1, state=2, status=1`，否则 `baseinfo` 不会返回 uid。
4. 清 `menuItems/pathmap` 缓存，让接口注册进路由。

## 本地开发

```bash
npm install
npm run dev        # http://127.0.0.1:6592
npm run build      # vue-tsc + vite build -> dist/
npm run pack       # 生成 dist-pack/*.oplg 并校验
node scripts/make-preview.mjs   # 生成可直接在浏览器打开的 preview.html（mock 宿主与 mock 云接口）
```

`preview.html` 只在本地视觉走查时用，不进发布包，已加入 `.gitignore`。
