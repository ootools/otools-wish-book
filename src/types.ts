export type SlotState = 'empty' | 'star' | 'redeemed';

export interface StarSlot {
  state: SlotState;
  note?: string;
  at?: number;
}

/** 存折中的一页，每页固定 32 个星星凹槽。 */
export interface BookPage {
  id: string;
  title: string;
  slots: StarSlot[];
}

export interface Child {
  id: string;
  name: string;
  birth: string;
  hobby: string;
  avatar: string;
  /** 一个孩子 = 一份存折；一份存折包含多页。 */
  pages: BookPage[];
  /** @deprecated 旧版「一个孩子一页」数据，读取时迁移到 pages[0]，不再写入。 */
  slots?: StarSlot[];
}

export interface Wish {
  id: string;
  name: string;
  icon: string;
  cost: number;
  done: boolean;
  doneAt?: number;
}

export interface BookState {
  children: Child[];
  activeId: string;
  /** 每个孩子当前翻到的页索引，切换孩子时各自保留。 */
  activePageByChild: Record<string, number>;
  wishes: Wish[];
}

export interface PluginSession {
  sessionToken: string;
  expireIn: number;
}

export interface PluginProfile {
  openid: string;
  nickname?: string;
  avatar?: string;
  official?: boolean;
}

export const SLOT_COUNT = 32;
/** 新建存折默认页数。 */
export const DEFAULT_PAGE_COUNT = 3;

export const emptySlots = (): StarSlot[] =>
  Array.from({ length: SLOT_COUNT }, () => ({ state: 'empty' as const }));

export const makePage = (index: number, slots: StarSlot[] = emptySlots()): BookPage => ({
  id: `page-${index + 1}`,
  title: `第 ${index + 1} 页`,
  slots,
});

export const makePages = (count = DEFAULT_PAGE_COUNT): BookPage[] =>
  Array.from({ length: Math.max(1, count) }, (_, index) => makePage(index));
