<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ childName: string; pageNumber: number; remaining: number }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'stick', payload: { count: number; note: string }): void;
}>();

const count = ref(5);
const note = ref('');
const reasons = ['按时睡觉', '自己吃饭', '刷牙', '整理玩具'];
const pick = (reason: string): void => {
  note.value = note.value === reason ? '' : reason;
};
const submit = (): void => {
  emit('stick', { count: count.value, note: note.value.trim() || '棒棒的表现' });
};
</script>

<template>
  <div class="sheet-mask" @click.self="emit('close')">
    <div class="sheet">
      <h3>奖励星星</h3>
      <div class="hint">贴到「{{ childName }}」存折第 {{ pageNumber }} 页 · 当前剩余 {{ remaining }} 个空槽</div>
      <div class="field">
        <label>数量</label>
        <div class="qty-row">
          <button v-for="value in [1, 3, 5]" :key="value" class="qty" :class="{ active: count === value }" type="button" @click="count = value">
            <svg><use href="#ic-star" /></svg>{{ value }} 颗
          </button>
        </div>
      </div>
      <div class="field">
        <label>原因</label>
        <input v-model="note" maxlength="30" placeholder="例如：自己收拾了玩具" />
        <div class="chips" style="margin-top: 8px;">
          <button v-for="reason in reasons" :key="reason" class="chip" :class="{ active: note === reason }" type="button" @click="pick(reason)">{{ reason }}</button>
        </div>
      </div>
      <div class="sheet-actions">
        <button class="btn secondary" type="button" @click="emit('close')">取消</button>
        <button class="btn" type="button" :disabled="count > remaining" @click="submit">贴上星星 ✦</button>
      </div>
    </div>
  </div>
</template>
