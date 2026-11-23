<script setup lang="ts">
defineProps<{ message: string; detail: string }>();
const emit = defineEmits<{
  (e: 'open-settings'): void;
  (e: 'retry'): void;
  (e: 'use-local'): void;
  (e: 'dismiss'): void;
}>();
</script>

<template>
  <div class="sheet-mask login-mask" @click.self="emit('dismiss')">
    <div class="sheet login-sheet">
      <div class="login-icon"><svg><use href="#ic-flower" /></svg></div>
      <h3>需要先登录 OTools</h3>
      <p class="hint">{{ message }}</p>
      <p v-if="detail" class="detail">{{ detail }}</p>
      <p class="note">
        点击「去设置登录」会自动打开 OTools 设置 → 账号页；登录完成后回到本插件会自动继续。
      </p>
      <p class="note">也可以切回本机模式，无需登录账号。</p>
      <div class="sheet-actions">
        <button class="btn secondary" type="button" @click="emit('use-local')">改用本机</button>
        <button class="btn secondary" type="button" @click="emit('retry')">重试</button>
        <button class="btn" type="button" @click="emit('open-settings')">去设置登录</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-mask {
  z-index: 60;
}
.login-sheet {
  width: 400px;
  text-align: center;
}
.login-icon svg {
  width: 48px;
  height: 48px;
}
.login-sheet .hint {
  font-size: 13px;
  margin: 6px 0 8px;
}
.detail {
  font-size: 11px;
  color: var(--seal);
  margin: 0 0 10px;
  word-break: break-all;
}
.note {
  font-size: 11px;
  color: var(--text-2);
  line-height: 1.8;
  background: #fff8fa;
  border: 1px dashed var(--pink-line);
  border-radius: 10px;
  padding: 8px 10px;
  margin: 0;
}
</style>
