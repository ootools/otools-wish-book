<script setup lang="ts">
import { ref } from 'vue';
import { removeChild, setActiveChild, state, upsertChild } from '../store';
import type { Child } from '../types';

const emit = defineEmits<{ (e: 'back'): void }>();

const editingId = ref<string | null>(null);
const draft = ref({ name: '', birth: '', hobby: '', avatar: 'av-doudou' });
const confirmingId = ref<string | null>(null);

const starCount = (child: Child): number => child.slots.filter((slot) => slot.state !== 'empty').length;

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

const confirmRemove = (id: string): void => {
  if (confirmingId.value === id) {
    removeChild(id);
    confirmingId.value = null;
    return;
  }
  confirmingId.value = id;
  setTimeout(() => {
    if (confirmingId.value === id) {
      confirmingId.value = null;
    }
  }, 3000);
};
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>我的宝宝</h2>
        <div class="sub">每个宝宝是存折里独立的一页，星星在各页分别累计</div>
      </div>
      <span class="page-badge">{{ state.children.length }} 页</span>
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
          <div v-if="child.id === state.activeId">当前页</div>
        </div>
        <div class="kid-stat">
          <div class="n">{{ starCount(child) }} ★</div>
          <div class="cap">本页星星</div>
        </div>
        <div class="kid-actions">
          <button class="icon-btn" type="button" title="设为当前页" @click="setActiveChild(child.id)">
            <svg><use href="#ic-book" /></svg>
          </button>
          <button class="icon-btn" type="button" title="编辑" @click="startEdit(child)">
            <svg><use href="#ic-pencil" /></svg>
          </button>
          <button class="icon-btn" type="button" :title="confirmingId === child.id ? '再点一次确认删除' : '删除'" @click="confirmRemove(child.id)">
            <svg><use href="#ic-trash" /></svg>
          </button>
        </div>
      </div>
      <button class="btn" type="button" @click="startEdit()">＋ 添加宝宝（新增一页）</button>
    </div>

    <div v-else class="sheet" style="margin: 20px auto;">
      <h3>{{ editingId ? '编辑宝宝' : '添加宝宝' }}</h3>
      <div class="field">
        <label>姓名</label>
        <input v-model="draft.name" maxlength="20" placeholder="例如：朵朵" />
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

    <div class="bottom-bar">
      <button class="btn" type="button" @click="emit('back')">返回存折</button>
    </div>
  </div>
</template>
