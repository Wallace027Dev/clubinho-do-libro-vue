<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BookReview from '../components/BookReview.vue'
import ClickableCard from '../components/ui/ClickableCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import { useInfiniteScroll } from '../composables/useInfiniteScroll'
import { usePlatformStore } from '../stores/platformStore'
import type { Chapter } from '../types/platform'
import { chapterTag, isStandaloneChapterTitle } from '../utils/chapters'

const router = useRouter()
const platformStore = usePlatformStore()
const currentBook = computed(() => platformStore.clubState.currentBook)

// Os capítulos já vêm todos no payload; aqui só renderizamos em janelas de 30
// com scroll infinito para não montar listas enormes de uma vez.
const PAGE = 30
const visibleCount = ref(PAGE)
const visibleChapters = computed(() => currentBook.value?.chapters.slice(0, visibleCount.value) ?? [])
const hasMoreChapters = computed(() => (currentBook.value?.chapters.length ?? 0) > visibleCount.value)

// Novo livro (ou recarga) volta a janela para o começo.
watch(
  () => currentBook.value?.id,
  () => {
    visibleCount.value = PAGE
  }
)

const sentinel = ref<HTMLElement | null>(null)
useInfiniteScroll(sentinel, () => {
  visibleCount.value += PAGE
  return hasMoreChapters.value
})

onMounted(() => {
  void platformStore.loadHome()
})

function getChapterStatus(chapter: Chapter): 'NOT_STARTED' | 'STARTED' | 'FINISHED' {
  return chapter.progress[0]?.status ?? 'NOT_STARTED'
}

const statusLabels = {
  NOT_STARTED: 'Não iniciado',
  STARTED: 'Em leitura',
  FINISHED: 'Concluído'
} as const

function openChapter(chapter: Chapter) {
  void router.push(`/chapters/${chapter.id}`)
}
</script>

<template>
  <section class="glass-panel current-book">
    <div>
      <p class="section-label">Meus capítulos</p>
      <h2 v-if="currentBook">{{ currentBook.book.title }}</h2>
      <h2 v-else>Nenhum livro em andamento</h2>
      <p v-if="currentBook">
        Toque em um capítulo para registrar seu progresso e comentar.
      </p>
      <p v-else>Quando o administrador aceitar um sorteio, os capítulos aparecem aqui.</p>
    </div>
  </section>

  <EmptyState v-if="platformStore.isLoading && !currentBook" message="Carregando capítulos..." />

  <SectionCard v-if="currentBook" label="Capítulos" title="Seu progresso de leitura">
    <ol v-if="currentBook.chapters.length" class="feed-list">
      <ClickableCard
        v-for="chapter in visibleChapters"
        :key="chapter.id"
        class="chapter-card"
        :aria-label="`Abrir ${chapterTag(chapter)}: ${chapter.title}`"
        @activate="openChapter(chapter)"
      >
        <div class="feed-card-top">
          <span class="feed-tag">{{ chapterTag(chapter) }}</span>
          <span
            class="chapter-status"
            :class="`chapter-status--${getChapterStatus(chapter).toLowerCase()}`"
          >
            {{ statusLabels[getChapterStatus(chapter)] }}
          </span>
        </div>
        <div class="chapter-card-row">
          <!-- Prólogo/Epílogo já aparecem na etiqueta; não repete o nome. -->
          <strong>{{ isStandaloneChapterTitle(chapter.title) ? '' : chapter.title }}</strong>
          <ChevronRight class="chapter-chevron" :size="20" aria-hidden="true" />
        </div>
      </ClickableCard>
    </ol>

    <EmptyState v-else message="O admin ainda não cadastrou capítulos para este livro." />

    <div v-if="hasMoreChapters" ref="sentinel" class="list-sentinel" aria-hidden="true"></div>
  </SectionCard>

  <BookReview v-if="currentBook" />
</template>
