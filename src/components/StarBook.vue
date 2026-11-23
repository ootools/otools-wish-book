<script setup lang="ts">
import { ref, type CSSProperties } from 'vue';
import {
  activeChild,
  childIndex,
  commitStars,
  previewStarSlots,
  redeemedCount,
  starCount,
} from '../store';

const emit = defineEmits<{
  (e: 'reward'): void;
  (e: 'wishes'): void;
  (e: 'kids'): void;
  (e: 'full'): void;
}>();

interface Flight {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  delay: number;
  style: CSSProperties & { '--tx': string; '--ty': string };
}

const slotRefs = ref<(HTMLElement | null)[]>([]);
const rewardButton = ref<HTMLElement | null>(null);
const flights = ref<Flight[]>([]);
const justStuck = ref<number[]>([]);
const justRedeemed = ref<number[]>([]);
let flightId = 0;

const setSlotRef = (el: unknown, index: number): void => {
  slotRefs.value[index] = (el as HTMLElement | null) ?? null;
};

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** 贴星动画：星星从按钮飞向目标凹槽，落下后再真正写入数据。 */
const stickStars = async (count: number, note: string): Promise<void> => {
  const indexes = previewStarSlots(count);
  if (!indexes.length) {
    emit('full');
    return;
  }
  const from = rewardButton.value?.getBoundingClientRect();
  const originX = from ? from.left + from.width / 2 : window.innerWidth - 80;
  const originY = from ? from.top + from.height / 2 : window.innerHeight - 40;
  const next: Flight[] = [];
  indexes.forEach((index, order) => {
    const rect = slotRefs.value[index]?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    next.push({
      id: ++flightId,
      x: originX,
      y: originY,
      tx: x - originX,
      ty: y - originY,
      delay: order * 90,
      style: {
        left: `${originX}px`,
        top: `${originY}px`,
        '--tx': `${x - originX}px`,
        '--ty': `${y - originY}px`,
        animationDelay: `${order * 90}ms`,
      },
    });
  });
  flights.value = next;
  await wait(700 + Math.max(0, next.length - 1) * 90);
  flights.value = [];
  commitStars(indexes, note);
  justStuck.value = indexes;
  setTimeout(() => {
    justStuck.value = [];
  }, 900);
};

/** 兑换成功后给被消耗的星星逐枚蓋章。 */
const stampRedeemed = (indexes: number[]): void => {
  justRedeemed.value = indexes;
  setTimeout(() => {
    justRedeemed.value = [];
  }, 900);
};

defineExpose({ stickStars, stampRedeemed });
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="avatar"><svg><use :href="`#${activeChild.avatar}`" /></svg></div>
      <div>
        <h2>{{ activeChild.name }}的集星页</h2>
        <div class="sub">把星星贴进凹槽里吧 ✦</div>
      </div>
      <span class="page-badge">第 {{ childIndex + 1 }} 页</span>
    </div>

    <div class="book-layout">
      <div class="book-main">
        <div class="book-stats">
          <span>本页星星 <b>{{ starCount }}</b> 颗</span>
          <span>·</span>
          <span>已兑换 <b>{{ redeemedCount }}</b> 颗</span>
        </div>
        <div class="star-grid">
          <div
            v-for="(slot, index) in activeChild.slots"
            :key="index"
            :ref="(el) => setSlotRef(el, index)"
            class="star-slot"
            :class="[
              slot.state,
              { 'just-stuck': justStuck.includes(index), 'just-redeemed': justRedeemed.includes(index) },
            ]"
            :title="slot.note || '空槽'"
          >
            <svg v-if="slot.state !== 'empty'"><use :href="slot.state === 'star' ? '#ic-star' : '#ic-star-grey'" /></svg>
            <span v-if="slot.state === 'redeemed'" class="seal">已兑换</span>
          </div>
        </div>
        <div class="legend">
          <span><i class="gold"></i>可用星星</span>
          <span><i class="grey"></i>已兑换（灰 + 朱红章）</span>
        </div>
      </div>

      <div class="side-card">
        <div class="count-big">
          <div class="num"><svg><use href="#ic-star" /></svg>{{ starCount }}</div>
          <div class="cap">本页累计 · 切页各自显示</div>
        </div>
        <div class="wish-note">
          <b>我的心愿</b>
          <textarea :value="activeChild.hobby" readonly placeholder="在孩子设置里填写" />
        </div>
        <button class="btn secondary small" type="button" @click="emit('wishes')">心愿清单 ›</button>
      </div>
    </div>

    <div class="bottom-bar">
      <button class="btn secondary" type="button" @click="emit('kids')">孩子设置</button>
      <button class="btn secondary" type="button" @click="emit('wishes')">心愿清单</button>
      <button ref="rewardButton" class="btn" type="button" @click="emit('reward')">＋ 奖励星星</button>
    </div>

    <div class="flight-layer">
      <div v-for="flight in flights" :key="flight.id" class="flight-star" :style="flight.style">
        <svg><use href="#ic-star" /></svg>
      </div>
    </div>
  </div>
</template>
