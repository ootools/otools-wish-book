/**
 * 生成可直接在浏览器打开的设计预览 preview.html（不进发布包）。
 *
 * 用假的 window.otools 与假的 xycloud 响应跑通 UI，方便核对动效与多孩逻辑。
 * 真实插件里这些能力都由宿主和 xycloud 提供，本脚本只用于视觉/交互走查。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');

const mock = `<script>
(() => {
  const json = (data) => new Response(JSON.stringify({ code: 200, msg: '成功', data }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
  let stored = null;
  // 预览里用 sessionStorage 模拟宿主文件的跨刷新持久化（真实插件由宿主落盘）。
  const localStore = {
    get(key) { try { const v = sessionStorage.getItem('wish:' + key); return v === null ? null : JSON.parse(v); } catch { return null; } },
    set(key, value) { try { sessionStorage.setItem('wish:' + key, JSON.stringify(value)); } catch {} },
  };
  const params = new URLSearchParams(location.search);
  // ?login=0 模拟宿主未登录；?expire=1 模拟云端令牌过期一次（用于验证自动续期）。
  let loggedIn = params.get('login') !== '0';
  let expireOnce = params.get('expire') === '1';
  window.otools = {
    apiVersion: 6,
    async fetchUserServerTemporaryToken() {
      if (!loggedIn) {
        const error = new Error('请先登录 OTools 账号');
        error.reason = 'not_logged_in';
        throw error;
      }
      return { token: 'preview-token-' + Date.now(), expireIn: 7200, openid: 'preview-openid', nickname: '预览', avatar: '' };
    },
    async getAuthCode() { return 'preview-token'; },
    async openLoginSettings() {
      loggedIn = true;
      window.alert('（预览）已模拟在设置页登录，关闭提示后回到插件会自动继续');
    },
    async getPluginLocalStateValue(_plugin, key) { return localStore.get(key); },
    async savePluginLocalStateValue(_plugin, key, value) { localStore.set(key, value); },
  };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('/wishbook/book/data')) {
      if (expireOnce) {
        expireOnce = false;
        return new Response(JSON.stringify({ code: 401, msg: '登录已过期，请重新获取令牌', data: {} }), { status: 200 });
      }
      const body = init && init.body ? JSON.parse(init.body) : {};
      if (body.value !== undefined) { stored = body.value; return json({ value: stored }); }
      return json({ value: stored });
    }
    return nativeFetch(input, init);
  };
})();
<\/script>`;

const html = source
  .replace('</head>', `${mock}\n  </head>`)
  .replace(/(src|href)="\.\/(assets\/)/g, '$1="./dist/$2');

fs.writeFileSync(path.join(root, 'preview.html'), html, 'utf8');
console.log('preview.html 已生成（ mock 宿主与 mock xycloud ）');
