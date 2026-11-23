/**
 * OTools 宿主能力适配层。
 *
 * 优先使用 uTools 同款 `fetchUserServerTemporaryToken()`，packid 由宿主隐藏传入；
 * 老宿主回落到 `getAuthCode()`。业务组件不区分运行时，也拿不到 JWT / uid。
 */
export interface UserServerToken {
  token: string;
  expireIn: number;
  openid?: string;
  nickname?: string;
  avatar?: string;
}

interface OToolsHostApi {
  apiVersion?: number;
  fetchUserServerTemporaryToken?(): Promise<UserServerToken>;
  getAuthCode?(): Promise<string>;
  openLoginSettings?(): Promise<void>;
  getPluginLocalStateValue?(plugin?: string, key?: string, scheme?: string | null): Promise<unknown | null>;
  savePluginLocalStateValue?(plugin?: string, key?: string, value?: unknown, scheme?: string | null): Promise<void>;
}

interface OToolsWindow extends Window {
  otools?: OToolsHostApi;
}

const getHost = (): OToolsHostApi | undefined =>
  typeof window === 'undefined' ? undefined : (window as OToolsWindow).otools;

export const hostApiVersion = (): number => getHost()?.apiVersion ?? 0;

export interface LoginRequiredError extends Error {
  reason?: string;
}

/** 未登录时由宿主打开设置 → 用户页；老宿主无此 API 时静默降级。 */
export async function openLoginSettings(): Promise<void> {
  const host = getHost();
  if (typeof host?.openLoginSettings === 'function') {
    await host.openLoginSettings();
  }
}

/** 向宿主请求 uTools 兼容的用户服务端临时令牌。 */
export async function requestUserToken(): Promise<UserServerToken> {
  const host = getHost();
  try {
    if (typeof host?.fetchUserServerTemporaryToken === 'function') {
      const result = await host.fetchUserServerTemporaryToken();
      if (result?.token) {
        return result;
      }
    }
    if (typeof host?.getAuthCode === 'function') {
      const token = await host.getAuthCode();
      if (token) {
        return { token, expireIn: 7200 };
      }
    }
  } catch (error) {
    const err = error as LoginRequiredError;
    if (!err.reason && /登录|未授权|unauthor/i.test(err.message || '')) {
      err.reason = 'not_logged_in';
    }
    throw err;
  }
  throw new Error('当前 OTools 宿主版本不支持插件登录，请升级到支持 apiVersion 6 的版本');
}

/** 本地缓存只按 openid 命名，openid 是 pseudonymous，不是 uid。 */
export async function loadLocal<T>(key: string): Promise<T | null> {
  const host = getHost();
  if (typeof host?.getPluginLocalStateValue !== 'function') {
    return null;
  }
  try {
    const value = await host.getPluginLocalStateValue(undefined, key, null);
    return value && typeof value === 'object' ? (value as T) : null;
  } catch {
    return null;
  }
}

export async function saveLocal<T>(key: string, value: T): Promise<void> {
  const host = getHost();
  if (typeof host?.savePluginLocalStateValue !== 'function') {
    return;
  }
  try {
    await host.savePluginLocalStateValue(undefined, key, value, null);
  } catch {
    // 云端已保存，本地缓存失败不影响主流程。
  }
}
