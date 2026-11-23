<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  childName: string;
  pageNumber: number;
  remaining: number;
  available: number;
  mode?: 'reward' | 'deduct';
}>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'stick', payload: { count: number; note: string }): void;
  (e: 'deduct', payload: { count: number; note: string }): void;
}>();

const isDeduct = computed(() => props.mode === 'deduct');
const limit = computed(() => (isDeduct.value ? props.available : props.remaining));
const count = ref(isDeduct.value ? 1 : 5);
const note = ref('');
const rewardReasons = ['按时睡觉', '自己吃饭', '刷牙', '整理玩具'];
const deductReasons = ['忘记收拾', '拖拉', '需要改进'];
const reasons = computed(() => (isDeduct.value ? deductReasons : rewardReasons));

const pick = (reason: string): void => {
  note.value = note.value === reason ? '' : reason;
};
const submit = (): void => {
  const payload = {
    count: count.value,
    note: note.value.trim() || (isDeduct.value ? '需要改进' : '棒棒的表现'),
  };
  if (isDeduct.value) {
    emit('deduct', payload);
  } else {
    emit('stick', payload);
  }
};
</script>

<template>
  <div class="sheet-mask" @click.self="emit('close')">
    <div class="sheet">
      <h3>{{ isDeduct ? '扣除星星' : '奖励星星' }}</h3>
      <div v-if="isDeduct" class="hint">从「{{ childName }}」存折第 {{ pageNumber }} 页扣除 · 当前可用 {{ available }} 颗（已兑换盖章的不扣）</div>
      <div v-else class="hint">贴到「{{ childName }}」存折第 {{ pageNumber }} 页 · 当前剩余 {{ remaining }} 个空槽</div>
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
        <input v-model="note" maxlength="30" :placeholder="isDeduct ? '例如：今天忘记收拾玩具' : '例如：自己收拾了玩具'" />
        <div class="chips" style="margin-top: 8px;">
          <button v-for="reason in reasons" :key="reason" class="chip" :class="{ active: note === reason }" type="button" @click="pick(reason)">{{ reason }}</button>
        </div>
      </div>
      <div class="sheet-actions">
        <button class="btn secondary" type="button" @click="emit('close')">取消</button>
        <button class="btn" type="button" :disabled="count > limit || limit <= 0" @click="submit">
          {{ isDeduct ? '扣除星星' : '贴上星星 ✦' }}
        </button>
      </div>
    </div>
  </div>
</template>
