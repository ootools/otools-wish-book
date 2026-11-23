<script setup lang="ts">
import type { Wish } from '../types';

defineProps<{ wish: Wish; available: number; childName: string }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <div class="sheet-mask" @click.self="emit('close')">
    <div class="sheet">
      <h3>兑换心愿券</h3>
      <div class="hint">将从「{{ childName }}」这一页扣除星星</div>
      <div class="ticket">
        <h4>{{ wish.name }}</h4>
        <div class="cost"><svg><use href="#ic-star" /></svg>消耗 {{ wish.cost }} 颗星</div>
        <p style="font-size: 11px; color: var(--text-2); margin-top: 10px;">✂ 撕下此券即可兑换</p>
      </div>
      <div class="hint">当前页可用 {{ available }} 颗 · 兑换后这些星星将盖章变灰</div>
      <div class="sheet-actions">
        <button class="btn secondary" type="button" @click="emit('close')">再想想</button>
        <button class="btn" type="button" :disabled="available < wish.cost" @click="emit('confirm')">确认兑换</button>
      </div>
    </div>
  </div>
</template>
