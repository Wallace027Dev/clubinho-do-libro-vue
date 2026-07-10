<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BookReview from '../components/BookReview.vue'
import { usePlatformStore } from '../stores/platformStore'
import type { Chapter } from '../types/platform'

const router = useRouter()
const platformStore = usePlatformStore()
const currentBook = computed(() => platformStore.clubState.currentBook)

onMounted(() => {
  void platformStore.loadHome()
})

function getChapterStatus(chapter: Chapter): 'NOT_STARTED' | 'STARTED' | 'FINISHED' {
  return chapter.progress[0]?.status ?? 'NOT_STARTED'
}

const statusLabels = {
  NOT_STARTED: 'Nao iniciado',
  STARTED: 'Em leitura',
  FINISHED: 'Concluido'
} as const

function openChapter(chapter: Chapter) {
  void router.push(`/chapters/${chapter.id}`)
}
</script>

<template>
  <section class="glass-panel current-book">
    <div>
      <p class="section-label">Meus capitulos</p>
      <h2 v-if="currentBook">{{ currentBook.book.title }}</h2>
      <h2 v-else>Nenhum livro em andamento</h2>
      <p v-if="currentBook">
        Toque em um capitulo para registrar seu progresso e comentar.
      </p>
      <p v-else>Quando o administrador aceitar um sorteio, os capitulos aparecem aqui.</p>
    </div>
  </section>

  <div v-if="platformStore.isLoading && !currentBook" class="empty-state">
    <p>Carregando capitulos...</p>
  </div>

  <section v-if="currentBook" class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Capitulos</p>
      <h2>Seu progresso de leitura</h2>
    </div>

    <ol v-if="currentBook.chapters.length" class="feed-list">
      <li
        v-for="chapter in currentBook.chapters"
        :key="chapter.id"
        class="feed-card is-clickable chapter-card"
        role="button"
        tabindex="0"
        :aria-label="`Abrir capitulo ${chapter.number}: ${chapter.title}`"
        @click="openChapter(chapter)"
        @keydown.enter.prevent="openChapter(chapter)"
        @keydown.space.prevent="openChapter(chapter)"
      >
        <div class="feed-card-top">
          <span class="feed-tag">Capitulo {{ chapter.number }}</span>
          <span
            class="chapter-status"
            :class="`chapter-status--${getChapterStatus(chapter).toLowerCase()}`"
          >
            {{ statusLabels[getChapterStatus(chapter)] }}
          </span>
        </div>
        <div class="chapter-card-row">
          <strong>{{ chapter.title }}</strong>
          <span class="chapter-chevron" aria-hidden="true">›</span>
        </div>
      </li>
    </ol>

    <div v-else class="empty-state">
      <p>O admin ainda nao cadastrou capitulos para este livro.</p>
    </div>
  </section>

  <BookReview v-if="currentBook" />
</template>
