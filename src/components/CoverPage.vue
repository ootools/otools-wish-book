<script setup lang="ts">
import { computed } from 'vue';
import { activeChild, state, starCount } from '../store';

const emit = defineEmits<{
  (e: 'open'): void;
  (e: 'kids'): void;
  (e: 'wishes'): void;
  (e: 'reward'): void;
}>();

const childCount = computed(() => state.value.children.length);
const starsOf = (id: string): number => {
  const child = state.value.children.find((item) => item.id === id);
  return child ? child.slots.filter((slot) => slot.state !== 'empty').length : 0;
};
const chooseChild = (id: string): void => {
  state.value.activeId = id;
};
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
        <div class="account-row"><span>本页星星</span><b>{{ starCount }} 颗</b></div>
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
          <span class="star-mini"><svg><use href="#ic-star" /></svg>{{ starsOf(child.id) }}</span>
        </button>
        <button class="child-tab" type="button" @click="emit('kids')">
          <svg class="av"><use href="#ic-plus" /></svg>
          <span>添加页（{{ childCount }}）</span>
        </button>
      </div>
      <button class="btn" type="button" @click="emit('open')">打开存折 ›</button>
      <button class="btn secondary" type="button" @click="emit('reward')">＋ 奖励星星</button>
    </div>
  </div>
</template>
