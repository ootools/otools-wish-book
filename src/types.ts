export type SlotState = 'empty' | 'star' | 'redeemed';

export interface StarSlot {
  state: SlotState;
  note?: string;
  at?: number;
}

export interface Child {
  id: string;
  name: string;
  birth: string;
  hobby: string;
  avatar: string;
  slots: StarSlot[];
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

export const emptySlots = (): StarSlot[] =>
  Array.from({ length: SLOT_COUNT }, () => ({ state: 'empty' as const }));
