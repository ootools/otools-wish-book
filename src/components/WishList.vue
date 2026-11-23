<script setup lang="ts">
import { computed, ref } from 'vue';
import { addWish, availableStars, removeWish, state } from '../store';

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'redeem', id: string): void;
}>();

const adding = ref(false);
const draft = ref({ name: '', icon: 'ic-gift', cost: '15' });
const pending = computed(() => state.value.wishes.filter((wish) => !wish.done));
const done = computed(() => state.value.wishes.filter((wish) => wish.done));
const progress = (cost: number): number => Math.min(100, Math.round((availableStars.value / cost) * 100));

const save = (): void => {
  const cost = Number(draft.value.cost);
  if (!draft.value.name.trim() || !Number.isFinite(cost) || cost < 1) {
    return;
  }
  addWish(draft.value.name, draft.value.icon, cost);
  draft.value = { name: '', icon: 'ic-gift', cost: '15' };
  adding.value = false;
};
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>心愿礼物</h2>
        <div class="sub">独立清单 · 所有孩子的每份存折共用</div>
      </div>
      <span class="page-badge">当前页可用 {{ availableStars }} ★</span>
    </div>

    <div class="wish-banner">
      此清单不与任何孩子或页面绑定：翻页、切换孩子，礼物与进度始终不变。兑换时从<b>当前孩子存折的当前页</b>扣除星星。
    </div>

    <div class="wish-grid">
      <div v-for="wish in pending" :key="wish.id" class="wish-card">
        <div class="wish-icon"><svg><use :href="`#${wish.icon}`" /></svg></div>
        <div class="wish-body">
          <h4>{{ wish.name }}</h4>
          <div class="progress"><i :style="{ width: `${progress(wish.cost)}%` }" /></div>
          <div class="wish-foot">
            <span>还差 {{ Math.max(0, wish.cost - availableStars) }} 颗 / {{ progress(wish.cost) }}%</span>
            <button
              class="btn small gold"
              type="button"
              :disabled="availableStars < wish.cost"
              @click="emit('redeem', wish.id)"
            >立即兑换</button>
          </div>
        </div>
        <button class="icon-btn" type="button" title="移除" @click="removeWish(wish.id)">
          <svg><use href="#ic-trash" /></svg>
        </button>
      </div>
    </div>

    <div v-if="done.length" class="wish-banner" style="margin-top: 14px;">
      <b>已完成</b>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
        <span v-for="wish in done" :key="wish.id" class="done-seal">{{ wish.name }} · 已兑换</span>
      </div>
    </div>

    <div v-if="adding" class="sheet" style="margin: 16px auto;">
      <h3>添加心愿礼物</h3>
      <div class="field">
        <label>礼物名称</label>
        <input v-model="draft.name" maxlength="20" placeholder="例如：亲子野餐" />
      </div>
      <div class="field">
        <label>需要星星</label>
        <input v-model="draft.cost" type="number" min="1" max="999" />
      </div>
      <div class="field">
        <label>图标</label>
        <div class="chips">
          <button v-for="icon in ['ic-gift', 'ic-carousel', 'ic-picnic']" :key="icon" class="chip" :class="{ active: draft.icon === icon }" type="button" @click="draft.icon = icon">
            {{ icon === 'ic-gift' ? '礼物' : icon === 'ic-carousel' ? '旋转木马' : '野餐' }}
          </button>
        </div>
      </div>
      <div class="sheet-actions">
        <button class="btn secondary" type="button" @click="adding = false">取消</button>
        <button class="btn" type="button" :disabled="!draft.name.trim()" @click="save">添加</button>
      </div>
    </div>
    <button v-else class="btn" style="margin-top: 14px;" type="button" @click="adding = true">＋ 添加心愿礼物</button>

    <div class="bottom-bar">
      <button class="btn" type="button" @click="emit('back')">返回存折</button>
    </div>
  </div>
</template>
