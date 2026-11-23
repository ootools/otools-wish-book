<script setup lang="ts">
import { ref, watch, type CSSProperties } from 'vue';
import { playFlip } from '../audio';
import {
  activeChild,
  activePage,
  addPage,
  commitStars,
  pageIndex,
  previewStarSlots,
  redeemedCount,
  removePage,
  setActivePage,
  starCount,
} from '../store';

const emit = defineEmits<{
  (e: 'reward'): void;
  (e: 'wishes'): void;
  (e: 'kids'): void;
  (e: 'deduct'): void;
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
const justDeducted = ref<number[]>([]);
const confirmingRemove = ref(false);
let flightId = 0;

// 翻页后旧的 DOM 引用失效，动画状态也要清掉。
watch(pageIndex, () => {
  slotRefs.value = [];
  flights.value = [];
  justStuck.value = [];
  justRedeemed.value = [];
  justDeducted.value = [];
  confirmingRemove.value = false;
});

const setSlotRef = (el: unknown, index: number): void => {
  slotRefs.value[index] = (el as HTMLElement | null) ?? null;
};

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** 翻到指定页。 */
const flipTo = (index: number): void => {
  if (index === pageIndex.value) {
    return;
  }
  playFlip();
  setActivePage(index);
};

/** 加页。 */
const appendPage = (): void => {
  playFlip();
  addPage();
};

/** 扣除后闪一下空槽。 */
const flashRemoved = (indexes: number[]): void => {
  justDeducted.value = indexes;
  setTimeout(() => {
    justDeducted.value = [];
  }, 700);
};

/** 删除当前页：连点两次确认，至少保留一页。 */
const deleteCurrentPage = (): void => {
  if (confirmingRemove.value) {
    confirmingRemove.value = false;
    removePage(pageIndex.value);
    return;
  }
  confirmingRemove.value = true;
  setTimeout(() => {
    confirmingRemove.value = false;
  }, 3000);
};

/** 贴星动画：星星从按钮飞向当前页的目标凹槽，落下后再真正写入数据。 */
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

defineExpose({ stickStars, stampRedeemed, flashRemoved });
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="avatar"><svg><use :href="`#${activeChild.avatar}`" /></svg></div>
      <div>
        <h2>{{ activeChild.name }}的存折</h2>
        <div class="sub">每一页都记录棒棒的表现 ✦</div>
      </div>
      <span class="page-badge">第 {{ pageIndex + 1 }} / {{ activeChild.pages.length }} 页</span>
    </div>

    <div class="page-strip" role="tablist" aria-label="存折页">
      <button
        v-for="(page, index) in activeChild.pages"
        :key="page.id"
        class="page-tab"
        :class="{ active: index === pageIndex }"
        type="button"
        role="tab"
        :aria-selected="index === pageIndex"
        @click="flipTo(index)"
      >{{ page.title }}</button>
      <button class="page-tab add" type="button" title="加一页" @click="appendPage">＋ 加页</button>
      <button
        class="page-tab remove"
        type="button"
        :disabled="activeChild.pages.length <= 1"
        :title="confirmingRemove ? '再点一次确认删除当前页' : '删除当前页'"
        @click="deleteCurrentPage"
      >{{ confirmingRemove ? '确认删？' : '删页' }}</button>
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
            v-for="(slot, index) in activePage.slots"
            :key="index"
            :ref="(el) => setSlotRef(el, index)"
            class="star-slot"
            :class="[
              slot.state,
              {
                'just-stuck': justStuck.includes(index),
                'just-redeemed': justRedeemed.includes(index),
                'just-deducted': justDeducted.includes(index),
              },
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
          <div class="cap">本页累计 · 各页分别统计</div>
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
      <button class="btn secondary" type="button" @click="emit('deduct')">－ 扣除星星</button>
      <button ref="rewardButton" class="btn" type="button" @click="emit('reward')">＋ 奖励星星</button>
    </div>

    <div class="flight-layer">
      <div v-for="flight in flights" :key="flight.id" class="flight-star" :style="flight.style">
        <svg><use href="#ic-star" /></svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 2px 8px;
}
.page-tab {
  flex: 0 0 auto;
  min-height: 26px;
  padding: 0 10px;
  border: 1.5px solid var(--pink-line);
  border-radius: var(--r-pill);
  background: #fff;
  color: var(--text-2);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.page-tab.active {
  background: var(--pink-cover);
  border-color: var(--pink-cover);
  color: #fff;
}
.page-tab.add { border-style: dashed; }
.page-tab.remove:disabled { opacity: .45; cursor: default; }
.star-slot.just-deducted { animation: slot-fade 700ms ease-out; }
@keyframes slot-fade {
  0% { transform: scale(1); opacity: 1; }
  45% { transform: scale(.62) rotate(-8deg); opacity: .25; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
