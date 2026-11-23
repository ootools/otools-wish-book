<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { playDelete } from '../audio';
import { pageCountOf, removeChild, setActiveChild, starCountOf, state, upsertChild } from '../store';
import type { Child } from '../types';

const emit = defineEmits<{ (e: 'back'): void }>();

const editingId = ref<string | null>(null);
const draft = ref({ name: '', birth: '', hobby: '', avatar: 'av-doudou' });

/** 删除孩子：30 秒倒计时 + 输入完整姓名确认，防误删。 */
const deletingId = ref<string | null>(null);
const deleteName = ref('');
const deleteLeft = ref(30);
const deleteInput = ref<HTMLInputElement | null>(null);
let deleteTimer: ReturnType<typeof setInterval> | null = null;

const deleteTarget = computed<Child | null>(
  () => state.value.children.find((child) => child.id === deletingId.value) ?? null,
);
const canConfirmDelete = computed(
  () => Boolean(deleteTarget.value && deleteName.value.trim() === deleteTarget.value.name && deleteLeft.value > 0),
);

const stopDeleteTimer = (): void => {
  if (deleteTimer) {
    clearInterval(deleteTimer);
    deleteTimer = null;
  }
};

const cancelDelete = (): void => {
  stopDeleteTimer();
  deletingId.value = null;
  deleteName.value = '';
};

const startDelete = async (child: Child): Promise<void> => {
  stopDeleteTimer();
  deletingId.value = child.id;
  deleteName.value = '';
  deleteLeft.value = 30;
  await nextTick();
  deleteInput.value?.focus();
  deleteTimer = setInterval(() => {
    deleteLeft.value -= 1;
    if (deleteLeft.value <= 0) {
      cancelDelete();
    }
  }, 1000);
};

const confirmDelete = (): void => {
  if (!canConfirmDelete.value || !deleteTarget.value) {
    return;
  }
  const id = deleteTarget.value.id;
  removeChild(id);
  playDelete();
  cancelDelete();
};

onBeforeUnmount(stopDeleteTimer);

const startEdit = (child?: Child): void => {
  editingId.value = child?.id ?? '';
  draft.value = {
    name: child?.name || '',
    birth: child?.birth || '',
    hobby: child?.hobby || '',
    avatar: child?.avatar || 'av-doudou',
  };
};

const save = (): void => {
  if (!draft.value.name.trim()) {
    return;
  }
  upsertChild({ id: editingId.value || undefined, ...draft.value });
  editingId.value = null;
};
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>我的孩子</h2>
        <div class="sub">每个孩子一份存折，每份存折可以翻多页，星星按页分别累计</div>
      </div>
      <span class="page-badge">{{ state.children.length }} 份</span>
    </div>

    <div v-if="editingId === null" class="kid-list">
      <div
        v-for="child in state.children"
        :key="child.id"
        class="kid-card"
        :class="{ active: child.id === state.activeId }"
      >
        <div class="kid-avatar"><svg><use :href="`#${child.avatar}`" /></svg></div>
        <div class="kid-meta">
          <strong>{{ child.name }}</strong>
          <div>编号 {{ child.id.slice(-4) }} · 出生 {{ child.birth || '未填写' }} · {{ child.hobby || '爱好未填写' }}</div>
          <div v-if="child.id === state.activeId">当前存折</div>
        </div>
        <div class="kid-stat">
          <div class="n">{{ starCountOf(child) }} ★</div>
          <div class="cap">共 {{ pageCountOf(child) }} 页</div>
        </div>
        <div class="kid-actions">
          <button class="icon-btn" type="button" title="设为当前存折" @click="setActiveChild(child.id)">
            <svg><use href="#ic-book" /></svg>
          </button>
          <button class="icon-btn" type="button" title="编辑" @click="startEdit(child)">
            <svg><use href="#ic-pencil" /></svg>
          </button>
          <button
            class="icon-btn"
            type="button"
            :disabled="state.children.length <= 1"
            :title="state.children.length <= 1 ? '至少保留一个孩子' : '删除孩子'"
            @click="startDelete(child)"
          >
            <svg><use href="#ic-trash" /></svg>
          </button>
        </div>
      </div>
      <button class="btn" type="button" @click="startEdit()">＋ 添加孩子（新建一份存折）</button>
    </div>

    <div v-else class="sheet" style="margin: 20px auto;">
      <h3>{{ editingId ? '编辑孩子' : '添加孩子' }}</h3>
      <div class="field">
        <label>姓名</label>
        <input v-model="draft.name" maxlength="20" placeholder="例如：子涵" />
      </div>
      <div class="field">
        <label>出生日期</label>
        <input v-model="draft.birth" type="date" />
      </div>
      <div class="field">
        <label>兴趣爱好</label>
        <input v-model="draft.hobby" maxlength="40" placeholder="例如：画画、小熊" />
      </div>
      <div class="field">
        <label>头像</label>
        <div class="chips">
          <button class="chip" :class="{ active: draft.avatar === 'av-doudou' }" type="button" @click="draft.avatar = 'av-doudou'">小黄帽</button>
          <button class="chip" :class="{ active: draft.avatar === 'av-anan' }" type="button" @click="draft.avatar = 'av-anan'">小熊</button>
        </div>
      </div>
      <div class="sheet-actions">
        <button class="btn secondary" type="button" @click="editingId = null">取消</button>
        <button class="btn" type="button" :disabled="!draft.name.trim()" @click="save">保存</button>
      </div>
    </div>

    <div v-if="deleteTarget" class="sheet-mask" @click.self="cancelDelete">
      <div class="sheet">
        <h3>删除孩子</h3>
        <div class="hint">删除「{{ deleteTarget.name }}」会移除 TA 的整份存折与所有页，不可恢复。</div>
        <div class="hint danger">请在 <b>{{ deleteLeft }}</b> 秒内输入名字「{{ deleteTarget.name }}」确认，超时自动取消。</div>
        <div class="field">
          <label>输入孩子名字</label>
          <input ref="deleteInput" v-model="deleteName" maxlength="20" :placeholder="`请输入「${deleteTarget.name}」`" />
        </div>
        <div class="sheet-actions">
          <button class="btn secondary" type="button" @click="cancelDelete">取消</button>
          <button class="btn danger-btn" type="button" :disabled="!canConfirmDelete" @click="confirmDelete">确认删除</button>
        </div>
      </div>
    </div>

    <div class="bottom-bar">
      <button class="btn" type="button" @click="emit('back')">返回存折</button>
    </div>
  </div>
</template>

<style scoped>
.hint.danger { color: #a33; font-weight: 600; }
.danger-btn { background: #a33; color: #fff; }
.danger-btn:disabled { opacity: .45; }
.icon-btn:disabled { opacity: .4; cursor: default; }
</style>
