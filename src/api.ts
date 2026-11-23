/**
 * xycloud 插件数据接口。
 *
 * 身份复用 uTools 兼容的 `fetchUserServerTemporaryToken()`：插件前端只拿
 * opaque accessToken 和 pseudonymous openid，uid 留在 xycloud 服务端。
 */
const API_BASE = 'https://otools-api.lingyun.net/api/v1';
const DATA_KEY = 'book-v1';

interface Envelope<T> {
  code: number;
  msg: string;
  data: T;
}

export class ApiError extends Error {
  constructor(message: string, readonly code: number) {
    super(message);
    this.name = 'ApiError';
  }

  get expired(): boolean {
    return this.code === 401;
  }
}

async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error(`网络连接失败：${String(error)}`);
  }
  const text = await response.text();
  let envelope: Envelope<T> | null = null;
  try {
    envelope = text ? (JSON.parse(text) as Envelope<T>) : null;
  } catch {
    envelope = null;
  }
  if (!envelope) {
    throw new ApiError(`服务异常（HTTP ${response.status}）`, response.status || 500);
  }
  const code = Number(envelope.code);
  if (!Number.isFinite(code) || code !== 200) {
    throw new ApiError(envelope.msg || `服务异常（HTTP ${response.status}）`, Number.isFinite(code) ? code : 500);
  }
  return envelope.data;
}

/** 按「服务端解析出的 uid + packid」隔离读写；请求里不能伪造 uid。 */
export async function loadCloudData<T>(accessToken: string): Promise<T | null> {
  const data = await request<{ value: string | null }>('/otools/identity/data', {
    accessToken,
    key: DATA_KEY,
  });
  if (!data?.value) {
    return null;
  }
  try {
    return JSON.parse(data.value) as T;
  } catch {
    return null;
  }
}

export async function saveCloudData<T>(accessToken: string, value: T): Promise<void> {
  await request('/otools/identity/data', {
    accessToken,
    key: DATA_KEY,
    value: JSON.stringify(value),
  });
}
