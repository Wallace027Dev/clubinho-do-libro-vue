<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BookReview from '../components/BookReview.vue'
import ChapterComments from '../components/ChapterComments.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import { ApiError } from '../services/apiClient'
import { usePlatformStore } from '../stores/platformStore'
import { useUiStore } from '../stores/uiStore'
import type { Chapter } from '../types/platform'

const platformStore = usePlatformStore()
const uiStore = useUiStore()
const currentBook = computed(() => platformStore.clubState.currentBook)
const pendingChapterId = ref<string | null>(null)

onMounted(() => {
  void platformStore.loadHome()
})

function getChapterStatus(chapter: Chapter): 'NOT_STARTED' | 'STARTED' | 'FINISHED' {
  return chapter.progress[0]?.status ?? 'NOT_STARTED'
}

function getStatusLabel(chapter: Chapter) {
  const status = getChapterStatus(chapter)

  if (status === 'FINISHED') {
    return 'Concluido'
  }

  if (status === 'STARTED') {
    return 'Em leitura'
  }

  return 'Nao iniciado'
}

async function startChapter(chapter: Chapter) {
  pendingChapterId.value = chapter.id

  try {
    await platformStore.startChapter(chapter.id)
    uiStore.notify(`Capitulo ${chapter.number} iniciado. Boa leitura!`)
  } catch (error) {
    uiStore.notify(
      error instanceof ApiError ? error.message : 'Nao foi possivel iniciar o capitulo.',
      'error'
    )
  } finally {
    pendingChapterId.value = null
  }
}

async function finishChapter(chapter: Chapter) {
  pendingChapterId.value = chapter.id

  try {
    await platformStore.finishChapter(chapter.id)
    uiStore.notify(`Capitulo ${chapter.number} concluido!`)
  } catch (error) {
    uiStore.notify(
      error instanceof ApiError ? error.message : 'Nao foi possivel concluir o capitulo.',
      'error'
    )
  } finally {
    pendingChapterId.value = null
  }
}
</script>

<template>
  <section class="glass-panel current-book">
    <div>
      <p class="section-label">Meus capitulos</p>
      <h2 v-if="currentBook">{{ currentBook.book.title }}</h2>
      <h2 v-else>Nenhum livro em andamento</h2>
      <p v-if="currentBook">
        Acompanhe sua leitura. As interacoes dos outros membros aparecem no feed.
      </p>
      <p v-else>Quando o administrador aceitar um sorteio, os capitulos aparecem aqui.</p>
    </div>

    <RouterLink v-if="currentBook" class="text-link" to="/feed">Ver o feed do clube</RouterLink>
  </section>

  <div v-if="platformStore.isLoading && !currentBook" class="empty-state">
    <p>Carregando capitulos...</p>
  </div>

  <section v-if="currentBook" class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Capitulos</p>
      <h2>Seu progresso de leitura</h2>
      <p>Iniciar e concluir capitulos gera atividades no feed do livro.</p>
    </div>

    <ol v-if="currentBook.chapters.length" class="chapter-list">
      <li v-for="chapter in currentBook.chapters" :key="chapter.id">
        <div class="chapter-main">
          <div>
            <span class="chapter-kicker">Capitulo {{ chapter.number }}</span>
            <strong>{{ chapter.title }}</strong>
            <p>{{ getStatusLabel(chapter) }}</p>
          </div>

          <BaseButton
            v-if="getChapterStatus(chapter) === 'NOT_STARTED'"
            class="chapter-action"
            variant="secondary"
            :loading="pendingChapterId === chapter.id"
            @click="startChapter(chapter)"
          >
            Iniciar
          </BaseButton>

          <BaseButton
            v-else-if="getChapterStatus(chapter) === 'STARTED'"
            class="chapter-action"
            :loading="pendingChapterId === chapter.id"
            @click="finishChapter(chapter)"
          >
            Concluir
          </BaseButton>
        </div>

        <ChapterComments v-if="getChapterStatus(chapter) === 'FINISHED'" :chapter-id="chapter.id" />

        <p v-else class="spoiler-lock">
          Seu comentario deste capitulo abre depois que voce concluir a leitura.
        </p>
      </li>
    </ol>

    <div v-else class="empty-state">
      <p>O admin ainda nao cadastrou capitulos para este livro.</p>
    </div>
  </section>

  <BookReview v-if="currentBook" />
</template>
