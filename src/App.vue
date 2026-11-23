<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import CoverPage from './components/CoverPage.vue';
import KidsSettings from './components/KidsSettings.vue';
import LoginPrompt from './components/LoginPrompt.vue';
import RedeemSheet from './components/RedeemSheet.vue';
import RewardSheet from './components/RewardSheet.vue';
import StarBook from './components/StarBook.vue';
import WishList from './components/WishList.vue';
import { hostApiVersion, openLoginSettings } from './host';
import {
  activeChild,
  availableStars,
  dismissLoginPrompt,
  initialize,
  loginPrompt,
  previewStarSlots,
  redeem,
  state,
  status,
  lastError,
} from './store';

type View = 'cover' | 'book' | 'kids' | 'wishes';
const view = ref<View>('cover');
const bookRef = ref<InstanceType<typeof StarBook> | null>(null);
const rewardOpen = ref(false);
const redeemId = ref('');
const toast = ref('');
const redeemWish = computed(() => state.value.wishes.find((wish) => wish.id === redeemId.value));

let retryTimer: ReturnType<typeof setTimeout> | null = null;
let loginWatchTimer: ReturnType<typeof setInterval> | null = null;

const stopLoginWatch = (): void => {
  if (loginWatchTimer) {
    clearInterval(loginWatchTimer);
    loginWatchTimer = null;
  }
};

/** 部分 webview 切回来不触发 focus，点过「去设置登录」后用轮询兜底。 */
const startLoginWatch = (): void => {
  stopLoginWatch();
  loginWatchTimer = setInterval(() => {
    void initialize().then(() => {
      if (status.value !== 'login') {
        stopLoginWatch();
      }
    });
  }, 1500);
};

/** 从设置页登录回来后自动重试，用户无需再点一次。 */
const retryOnReturn = (): void => {
  if (status.value !== 'login') {
    return;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
  }
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (status.value === 'login') {
      void initialize();
    }
  }, 500);
};

const onVisibilityChange = (): void => {
  if (document.visibilityState === 'visible') {
    retryOnReturn();
  }
};

onMounted(() => {
  void initialize();
  window.addEventListener('focus', retryOnReturn);
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onBeforeUnmount(() => {
  window.removeEventListener('focus', retryOnReturn);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  if (retryTimer) {
    clearTimeout(retryTimer);
  }
  stopLoginWatch();
});

const notify = (message: string): void => {
  toast.value = message;
  setTimeout(() => {
    if (toast.value === message) {
      toast.value = '';
    }
  }, 2600);
};

const goLogin = async (): Promise<void> => {
  if (hostApiVersion() < 6) {
    notify('当前宿主版本不支持自动跳转，请手动打开 OTools 设置 → 账号页登录');
    return;
  }
  try {
    await openLoginSettings();
    startLoginWatch();
    notify('已打开设置 → 账号页，登录后回到这里会自动继续');
  } catch (error) {
    notify(`打开设置失败：${error instanceof Error ? error.message : String(error)}`);
  }
};

const retryInitialize = async (): Promise<void> => {
  dismissLoginPrompt();
  await initialize();
};

const openReward = async (): Promise<void> => {
  if (view.value !== 'book') {
    view.value = 'book';
    await nextTick();
  }
  rewardOpen.value = true;
};

const stick = async (payload: { count: number; note: string }): Promise<void> => {
  rewardOpen.value = false;
  if (!previewStarSlots(payload.count).length) {
    notify('这一页的 32 个凹槽已经贴满啦');
    return;
  }
  await bookRef.value?.stickStars(payload.count, payload.note);
  notify(`已贴上 ${payload.count} 颗星星`);
};

const confirmRedeem = async (): Promise<void> => {
  const wish = redeemWish.value;
  if (!wish) {
    return;
  }
  const indexes = redeem(wish.id);
  redeemId.value = '';
  if (!indexes.length) {
    notify('当前页星星不够，先贴几颗吧');
    return;
  }
  view.value = 'book';
  await nextTick();
  bookRef.value?.stampRedeemed(indexes);
  notify(`「${wish.name}」已兑换，${indexes.length} 颗星盖上了已兑换章`);
};
</script>

<template>
  <div class="passbook">
    <div class="holes"><i v-for="n in 9" :key="n" /></div>

    <div v-if="status === 'loading'" class="center-state">
      <svg class="big"><use href="#ic-star" /></svg>
      <h2>正在打开心愿存折…</h2>
    </div>

    <div v-else-if="status === 'login'" class="center-state">
      <svg class="big"><use href="#ic-flower" /></svg>
      <h2>请先登录 OTools 账号</h2>
      <p>心愿存折通过宿主登录身份保存数据，不会把账号凭证交给插件。</p>
      <p v-if="lastError" class="err">{{ lastError }}</p>
      <div class="login-actions">
        <button class="btn secondary" type="button" @click="retryInitialize()">重试</button>
        <button class="btn" type="button" @click="goLogin()">去设置登录</button>
      </div>
    </div>

    <template v-else>
      <CoverPage
        v-if="view === 'cover'"
        @open="view = 'book'"
        @kids="view = 'kids'"
        @wishes="view = 'wishes'"
        @reward="openReward"
      />
      <StarBook
        v-else-if="view === 'book'"
        ref="bookRef"
        @reward="openReward"
        @wishes="view = 'wishes'"
        @kids="view = 'kids'"
        @full="notify('这一页的 32 个凹槽已经贴满啦')"
      />
      <KidsSettings v-else-if="view === 'kids'" @back="view = 'book'" />
      <WishList v-else @back="view = 'book'" @redeem="redeemId = $event" />

      <RewardSheet
        v-if="rewardOpen"
        :child-name="activeChild.name"
        :remaining="activeChild.slots.filter((slot) => slot.state === 'empty').length"
        @close="rewardOpen = false"
        @stick="stick"
      />
      <RedeemSheet
        v-if="redeemWish"
        :wish="redeemWish"
        :available="availableStars"
        :child-name="activeChild.name"
        @close="redeemId = ''"
        @confirm="confirmRedeem"
      />
    </template>

    <LoginPrompt
      v-if="loginPrompt"
      :message="loginPrompt.message"
      :detail="loginPrompt.detail"
      @open-settings="goLogin"
      @retry="retryInitialize"
      @dismiss="dismissLoginPrompt"
    />

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<style scoped>
.login-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.toast {
  position: absolute;
  left: 50%; bottom: 82px;
  transform: translateX(-50%);
  z-index: 40;
  background: rgba(107, 58, 74, .92);
  color: #fff;
  font-size: 12px;
  border-radius: var(--r-pill);
  padding: 9px 16px;
  box-shadow: 0 6px 18px rgba(107, 58, 74, .25);
}
</style>
