import { computed, ref } from 'vue';
import { ApiError, loadCloudData, saveCloudData } from './api';
import { loadLocal, requestUserToken, saveLocal, type LoginRequiredError } from './host';
import {
  DEFAULT_PAGE_COUNT,
  SLOT_COUNT,
  emptySlots,
  makePage,
  makePages,
  type BookPage,
  type BookState,
  type Child,
  type SlotState,
  type StarSlot,
  type Wish,
} from './types';

const makeId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const DEFAULT_CHILD_ID = 'child-zihan';

/** 默认只有一个孩子「子涵」，TA 的存折默认三页。 */
const defaultState = (): BookState => ({
  activeId: DEFAULT_CHILD_ID,
  activePageByChild: { [DEFAULT_CHILD_ID]: 0 },
  children: [
    {
      id: DEFAULT_CHILD_ID,
      name: '子涵',
      birth: '',
      hobby: '',
      avatar: 'av-doudou',
      // 默认是一份全新的空白存折：三页都没有星星，也没有已兑换记录。
      pages: makePages(DEFAULT_PAGE_COUNT),
    },
  ],
  wishes: [
    { id: 'wish-carousel', name: '旋转木马', icon: 'ic-carousel', cost: 25, done: false },
    { id: 'wish-picnic', name: '亲子野餐', icon: 'ic-picnic', cost: 15, done: false },
    { id: 'wish-sticker', name: '贴纸绘本', icon: 'ic-gift', cost: 10, done: false },
  ],
});

const normalizeSlots = (value: unknown): StarSlot[] => {
  const source = Array.isArray(value) ? value : [];
  const slots = emptySlots();
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    const item = source[i] as Partial<StarSlot> | undefined;
    const state: SlotState = item?.state === 'star' || item?.state === 'redeemed' ? item.state : 'empty';
    slots[i] = {
      state,
      ...(typeof item?.note === 'string' ? { note: item.note } : {}),
      ...(typeof item?.at === 'number' ? { at: item.at } : {}),
    };
  }
  return slots;
};

const normalizePage = (value: unknown, index: number): BookPage => {
  const source = value && typeof value === 'object' ? (value as Partial<BookPage>) : {};
  return {
    id: typeof source.id === 'string' && source.id ? source.id : `page-${index + 1}`,
    title: typeof source.title === 'string' && source.title ? source.title : `第 ${index + 1} 页`,
    slots: normalizeSlots(source.slots),
  };
};

const normalizeChild = (value: unknown): Child | null => {
  const source = value && typeof value === 'object' ? (value as Partial<Child>) : {};
  if (typeof source.id !== 'string') {
    return null;
  }
  // 兼容旧版「一个孩子一页」存档：原来的 slots 变成这个孩子存折的第一页。
  const pages = Array.isArray(source.pages) && source.pages.length
    ? source.pages.map(normalizePage)
    : [makePage(0, normalizeSlots(source.slots))];
  return {
    id: source.id,
    name: String(source.name || '孩子'),
    birth: String(source.birth || ''),
    hobby: String(source.hobby || ''),
    avatar: source.avatar === 'av-anan' ? 'av-anan' : 'av-doudou',
    pages,
  };
};

const clampPage = (index: number, pageCount: number): number =>
  Math.max(0, Math.min(pageCount - 1, Math.floor(Number(index) || 0)));

const normalizeState = (value: unknown): BookState => {
  const source = value && typeof value === 'object' ? (value as Partial<BookState>) : {};
  const children: Child[] = Array.isArray(source.children)
    ? source.children.map(normalizeChild).filter((child): child is Child => child !== null)
    : [];
  if (!children.length) {
    return defaultState();
  }
  const wishes: Wish[] = Array.isArray(source.wishes)
    ? source.wishes
        .filter((item): item is Wish => Boolean(item && typeof item.id === 'string'))
        .map((item) => ({
          id: item.id,
          name: String(item.name || '心愿礼物'),
          icon: typeof item.icon === 'string' ? item.icon : 'ic-gift',
          cost: Math.max(1, Math.floor(Number(item.cost) || 1)),
          done: item.done === true,
          ...(typeof item.doneAt === 'number' ? { doneAt: item.doneAt } : {}),
        }))
    : [];
  const rawPages = source.activePageByChild && typeof source.activePageByChild === 'object'
    ? source.activePageByChild as Record<string, number>
    : {};
  const activePageByChild: Record<string, number> = {};
  for (const child of children) {
    activePageByChild[child.id] = clampPage(rawPages[child.id] ?? 0, child.pages.length);
  }
  return {
    children,
    activeId: children.some((child) => child.id === source.activeId) ? String(source.activeId) : children[0].id,
    activePageByChild,
    wishes,
  };
};

export type StorageMode = 'local' | 'cloud';
/** 默认本机模式：不碰身份接口，数据存宿主本地文件；云端模式才需要登录。 */
export const storageMode = ref<StorageMode>('local');
const MODE_KEY = 'wish-book:mode';
const LOCAL_DATA_KEY = 'wish-book:local';
/** 本机 → 云端切换时，等登录成功后把当前存折作为云端初始数据上传。 */
let pendingCloudUpload: BookState | null = null;

export const state = ref<BookState>(defaultState());
export const status = ref<'loading' | 'ready' | 'login'>('loading');
export const lastError = ref('');
/** 需要弹窗提示「去设置登录」时设置；普通网络错误不弹窗。 */
export const loginPrompt = ref<{ message: string; detail: string } | null>(null);
const accessToken = ref('');
const openid = ref('');

export const activeChild = computed<Child>(
  () => state.value.children.find((child) => child.id === state.value.activeId) || state.value.children[0],
);
export const childIndex = computed(() => Math.max(0, state.value.children.findIndex((c) => c.id === activeChild.value.id)));
/** 当前孩子在 TA 存折中翻到的页。 */
export const pageIndex = computed(() =>
  clampPage(state.value.activePageByChild[activeChild.value.id] ?? 0, activeChild.value.pages.length),
);
export const activePage = computed<BookPage>(
  () => activeChild.value.pages[pageIndex.value] || activeChild.value.pages[0],
);
export const starCount = computed(() => activePage.value.slots.filter((slot) => slot.state !== 'empty').length);
export const redeemedCount = computed(() => activePage.value.slots.filter((slot) => slot.state === 'redeemed').length);
export const availableStars = computed(() => starCount.value - redeemedCount.value);

/** 一个孩子所有页的星星总数（封面/孩子列表展示用）。 */
export const starCountOf = (child: Child): number =>
  child.pages.reduce((sum, page) => sum + page.slots.filter((slot) => slot.state !== 'empty').length, 0);
export const pageCountOf = (child: Child): number => child.pages.length;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** 绕开 TS 对 status 字面量的控制流收窄：异步续期可能已把它改成 login。 */
const isLoginStatus = (): boolean => String(status.value) === 'login';

/** 只把「宿主未登录 / 令牌失效」识别为需要弹窗，网络抖动不打扰用户。 */
const LOGIN_REQUIRED_PATTERN = /未登录|请先登录|需要登录|登录已过期|not.?logged.?in|unauthor/i;
const isLoginRequired = (error: unknown): boolean => {
  if (error instanceof ApiError) {
    return error.expired || LOGIN_REQUIRED_PATTERN.test(error.message);
  }
  const err = error as LoginRequiredError | undefined;
  return Boolean(
    err && (err.reason === 'not_logged_in' || LOGIN_REQUIRED_PATTERN.test(err.message || '')),
  );
};

const promptLogin = (detail: string): void => {
  status.value = 'login';
  lastError.value = detail;
  loginPrompt.value = {
    message: '宿主尚未登录 OTools 账号，请在设置页登录后重试。',
    detail,
  };
};

const reportAuthFailure = (error: unknown): void => {
  if (!isLoginRequired(error)) {
    return;
  }
  accessToken.value = '';
  promptLogin(error instanceof Error ? error.message : String(error));
};

/** 云端返回 401 时重新走 uTools 兼容令牌链路；并发只刷新一次。 */
let refreshTask: Promise<boolean> | null = null;
const refreshAccessToken = (): Promise<boolean> => {
  if (!refreshTask) {
    refreshTask = (async () => {
      try {
        const result = await requestUserToken();
        accessToken.value = result.token;
        if (result.openid) {
          openid.value = result.openid;
        }
        return true;
      } catch (error) {
        reportAuthFailure(error);
        return false;
      }
    })().finally(() => {
      refreshTask = null;
    });
  }
  return refreshTask;
};

/** 云读写统一入口：401 自动续期并重试一次；再次失败才提示登录。 */
const withCloudToken = async <T>(run: (token: string) => Promise<T>): Promise<T | null> => {
  try {
    return await run(accessToken.value);
  } catch (error) {
    if (error instanceof ApiError && error.expired) {
      if (!(await refreshAccessToken())) {
        return null;
      }
      try {
        return await run(accessToken.value);
      } catch (retryError) {
        reportAuthFailure(retryError);
        return null;
      }
    }
    reportAuthFailure(error);
    return null;
  }
};

export const dismissLoginPrompt = (): void => {
  loginPrompt.value = null;
};

const snapshotState = (): BookState => JSON.parse(JSON.stringify(state.value)) as BookState;

/** 本机模式只写宿主本地文件；云端模式写云端 + 本地缓存兜底。 */
const schedulePersist = (): void => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    const snapshot = snapshotState();
    if (storageMode.value === 'local') {
      void saveLocal(LOCAL_DATA_KEY, snapshot);
      return;
    }
    if (!accessToken.value) {
      return;
    }
    void withCloudToken((token) => saveCloudData(token, snapshot));
    void saveLocal(`wish-book:${openid.value}`, snapshot);
  }, 200);
};

/** 启动：先读模式；本机模式直接读本地文件，云端模式才走身份令牌。 */
const runInitialize = async (): Promise<void> => {
  status.value = 'loading';
  lastError.value = '';
  loginPrompt.value = null;

  const modeRecord = await loadLocal<{ mode?: StorageMode }>(MODE_KEY);
  storageMode.value = modeRecord?.mode === 'cloud' ? 'cloud' : 'local';

  if (storageMode.value === 'local') {
    const cached = await loadLocal<BookState>(LOCAL_DATA_KEY);
    state.value = cached ? normalizeState(cached) : defaultState();
    if (!cached) {
      schedulePersist();
    }
    status.value = 'ready';
    return;
  }

  // 云端模式：uTools 兼容令牌 → 云端数据（本地缓存兜底）。
  try {
    const result = await requestUserToken();
    accessToken.value = result.token;
    openid.value = result.openid || '';
  } catch (error) {
    accessToken.value = '';
    const detail = error instanceof Error ? error.message : String(error);
    if (isLoginRequired(error)) {
      promptLogin(detail);
    } else {
      status.value = 'login';
      lastError.value = detail;
    }
    return;
  }

  const cacheKey = `wish-book:${openid.value || 'anonymous'}`;
  const cached = await loadLocal<BookState>(cacheKey);
  if (cached) {
    state.value = normalizeState(cached);
  }

  const remote = await withCloudToken((token) => loadCloudData<BookState>(token));
  if (isLoginStatus()) {
    // 401 续期失败已弹窗，保留本地缓存，不覆盖登录态。
    return;
  }
  if (remote) {
    state.value = normalizeState(remote);
  } else if (!cached) {
    // 本机切云端后的首次同步：云端还没有存档，把本机数据传上去。
    if (pendingCloudUpload) {
      const snapshot = normalizeState(pendingCloudUpload);
      state.value = snapshot;
      void withCloudToken((token) => saveCloudData(token, snapshot));
      void saveLocal(cacheKey, snapshot);
      pendingCloudUpload = null;
    } else {
      state.value = defaultState();
      schedulePersist();
    }
  }
  status.value = 'ready';
};

/**
 * 切换存储模式：把当前存折写入目标存储，再初始化。
 * 云端模式没有登录时由 initialize() 弹登录窗，登录后自动续跑并完成上传。
 */
export const setStorageMode = async (next: StorageMode): Promise<void> => {
  if (next === storageMode.value) {
    return;
  }
  const snapshot = snapshotState();
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (next === 'local') {
    await saveLocal(LOCAL_DATA_KEY, snapshot);
    await saveLocal(MODE_KEY, { mode: 'local' });
    storageMode.value = 'local';
    status.value = 'ready';
    loginPrompt.value = null;
    lastError.value = '';
    return;
  }
  // 本机 → 云端：先记住当前数据，登录成功后作为云端初始存档上传。
  await saveLocal(MODE_KEY, { mode: 'cloud' });
  storageMode.value = 'cloud';
  pendingCloudUpload = snapshot;
  await initialize();
};

/** 登录回来后 focus 与轮询可能同时触发，这里做单飞避免重复初始化。 */
let initializeTask: Promise<void> | null = null;
export function initialize(): Promise<void> {
  if (!initializeTask) {
    initializeTask = runInitialize().finally(() => {
      initializeTask = null;
    });
  }
  return initializeTask;
}

export function setActiveChild(id: string): void {
  const child = state.value.children.find((item) => item.id === id);
  if (!child) {
    return;
  }
  state.value.activeId = id;
  if (state.value.activePageByChild[id] === undefined) {
    state.value.activePageByChild[id] = 0;
  }
  schedulePersist();
}

/** 翻到当前孩子存折的指定页。 */
export function setActivePage(index: number): void {
  const child = activeChild.value;
  state.value.activePageByChild[child.id] = clampPage(index, child.pages.length);
  schedulePersist();
}

/** 在当前孩子的存折末尾加一页。 */
export function addPage(): void {
  const child = activeChild.value;
  child.pages.push(makePage(child.pages.length));
  state.value.activePageByChild[child.id] = child.pages.length - 1;
  schedulePersist();
}

/** 删除当前孩子存折的指定页，至少保留一页。 */
export function removePage(index: number): void {
  const child = activeChild.value;
  if (child.pages.length <= 1) {
    return;
  }
  child.pages.splice(clampPage(index, child.pages.length), 1);
  child.pages.forEach((page, i) => {
    page.id = `page-${i + 1}`;
    page.title = `第 ${i + 1} 页`;
  });
  state.value.activePageByChild[child.id] = clampPage(index, child.pages.length);
  schedulePersist();
}

export function upsertChild(input: Partial<Child> & { name: string }): void {
  if (input.id && state.value.children.some((child) => child.id === input.id)) {
    const child = state.value.children.find((item) => item.id === input.id)!;
    child.name = input.name.trim() || '孩子';
    child.birth = input.birth || '';
    child.hobby = input.hobby || '';
    child.avatar = input.avatar || child.avatar;
    if (!child.pages?.length) {
      child.pages = makePages(DEFAULT_PAGE_COUNT);
    }
  } else {
    const id = input.id || makeId();
    state.value.children.push({
      id,
      name: input.name.trim() || '孩子',
      birth: input.birth || '',
      hobby: input.hobby || '',
      avatar: input.avatar || 'av-doudou',
      pages: makePages(DEFAULT_PAGE_COUNT),
    });
    state.value.activeId = id;
    state.value.activePageByChild[id] = 0;
  }
  schedulePersist();
}

export function removeChild(id: string): void {
  if (state.value.children.length <= 1) {
    return;
  }
  state.value.children = state.value.children.filter((child) => child.id !== id);
  delete state.value.activePageByChild[id];
  if (state.value.activeId === id) {
    state.value.activeId = state.value.children[0].id;
  }
  schedulePersist();
}

/** 返回当前页将要贴星的槽位索引；满 32 槽时返回空数组。 */
export function previewStarSlots(count: number): number[] {
  const slots = activePage.value.slots;
  const indexes: number[] = [];
  for (let i = 0; i < slots.length && indexes.length < count; i += 1) {
    if (slots[i].state === 'empty') {
      indexes.push(i);
    }
  }
  return indexes;
}

/** 真正写入星星（动画结束后调用，落在当前孩子当前页）。 */
export function commitStars(indexes: number[], note: string): void {
  const now = Date.now();
  for (const index of indexes) {
    const slot = activePage.value.slots[index];
    if (slot && slot.state === 'empty') {
      slot.state = 'star';
      slot.note = note;
      slot.at = now;
    }
  }
  schedulePersist();
}

/** 返回将要扣除的可用星槽位索引（从当前页末尾扣，已兑换盖章的不扣）。 */
export function previewDeductSlots(count: number): number[] {
  const slots = activePage.value.slots;
  const indexes: number[] = [];
  for (let i = slots.length - 1; i >= 0 && indexes.length < count; i -= 1) {
    if (slots[i].state === 'star') {
      indexes.push(i);
    }
  }
  return indexes;
}

/** 真正扣除星星（落在当前孩子当前页，只清可用星）。 */
export function commitDeduct(indexes: number[], note: string): void {
  const now = Date.now();
  for (const index of indexes) {
    const slot = activePage.value.slots[index];
    if (slot && slot.state === 'star') {
      slot.state = 'empty';
      slot.note = note;
      slot.at = now;
    }
  }
  schedulePersist();
}

export function addWish(name: string, icon: string, cost: number): void {
  const value = Math.max(1, Math.floor(cost || 1));
  state.value.wishes.push({ id: makeId(), name: name.trim() || '心愿礼物', icon, cost: value, done: false });
  schedulePersist();
}

export function removeWish(id: string): void {
  state.value.wishes = state.value.wishes.filter((wish) => wish.id !== id);
  schedulePersist();
}

/** 兑换：从当前孩子当前页扣对应数量的可用星星，并盖上已兑换章。 */
export function redeem(wishId: string): number[] {
  const wish = state.value.wishes.find((item) => item.id === wishId);
  if (!wish || wish.done || availableStars.value < wish.cost) {
    return [];
  }
  const slots = activePage.value.slots;
  const indexes: number[] = [];
  for (let i = 0; i < slots.length && indexes.length < wish.cost; i += 1) {
    if (slots[i].state === 'star') {
      indexes.push(i);
    }
  }
  const now = Date.now();
  for (const index of indexes) {
    const slot = slots[index];
    slot.state = 'redeemed';
    slot.note = `兑换：${wish.name}`;
    slot.at = now;
  }
  wish.done = true;
  wish.doneAt = now;
  schedulePersist();
  return indexes;
}
