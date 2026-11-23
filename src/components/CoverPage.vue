<script setup lang="ts">
import { computed } from 'vue';
import {
  activeChild,
  pageCountOf,
  setActiveChild,
  setStorageMode,
  starCountOf,
  state,
  storageMode,
} from '../store';

const emit = defineEmits<{
  (e: 'open'): void;
  (e: 'kids'): void;
  (e: 'wishes'): void;
  (e: 'reward'): void;
}>();

const childCount = computed(() => state.value.children.length);
const chooseChild = (id: string): void => setActiveChild(id);
</script>

<template>
  <div class="page cover-page">
    <div class="cover-left">
      <div class="cover-title">心愿存折</div>
      <svg class="cover-art"><use href="#cover-art" /></svg>
    </div>
    <div class="cover-right">
      <div class="kicker">WISH &amp; STAR PASSBOOK</div>
      <h1>每一颗星，都是棒棒的表现</h1>
      <div class="account-card">
        <h3>开户信息</h3>
        <div class="account-row"><span>开户人</span><b>{{ activeChild.name }}</b></div>
        <div class="account-row"><span>开户地点</span><b>温馨的家</b></div>
        <div class="account-row"><span>存折页数</span><b>{{ pageCountOf(activeChild) }} 页</b></div>
        <div class="account-row"><span>存折星星</span><b>{{ starCountOf(activeChild) }} 颗</b></div>
        <div class="account-row"><span>存档位置</span><b>{{ storageMode === 'cloud' ? '云端（需登录）' : '本机（免登录）' }}</b></div>
      </div>
      <div class="mode-switch" role="group" aria-label="存档位置">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: storageMode === 'local' }"
          :disabled="storageMode === 'local'"
          @click="setStorageMode('local')"
        >本机</button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: storageMode === 'cloud' }"
          :disabled="storageMode === 'cloud'"
          @click="setStorageMode('cloud')"
        >云端</button>
      </div>
      <div class="child-tabs">
        <button
          v-for="child in state.children"
          :key="child.id"
          class="child-tab"
          :class="{ active: child.id === state.activeId }"
          type="button"
          @click="chooseChild(child.id)"
        >
          <svg class="av"><use :href="`#${child.avatar}`" /></svg>
          <span>{{ child.name }}</span>
          <span class="star-mini"><svg><use href="#ic-star" /></svg>{{ starCountOf(child) }}</span>
        </button>
        <button class="child-tab" type="button" @click="emit('kids')">
          <svg class="av"><use href="#ic-plus" /></svg>
          <span>管理孩子（{{ childCount }}）</span>
        </button>
      </div>
      <button class="btn" type="button" @click="emit('open')">打开存折 ›</button>
      <button class="btn secondary" type="button" @click="emit('reward')">＋ 奖励星星</button>
    </div>
  </div>
</template>

<style scoped>
.mode-switch {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--pink-line);
  background: #fff;
  margin-top: 10px;
}
.mode-btn {
  min-width: 64px;
  min-height: 28px;
  border: 0;
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.mode-btn.active {
  background: var(--pink-cover);
  color: #fff;
  box-shadow: 0 2px 0 var(--pink-cover-d);
}
.mode-btn:disabled { cursor: default; }
</style>
