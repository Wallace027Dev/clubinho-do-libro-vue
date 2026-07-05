<script setup lang="ts">
import { computed, onMounted } from 'vue'
import BookReview from '../components/BookReview.vue'
import ChapterComments from '../components/ChapterComments.vue'
import { usePlatformStore } from '../stores/platformStore'
import type { Chapter } from '../types/platform'

const platformStore = usePlatformStore()
const currentBook = computed(() => platformStore.clubState.currentBook)

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

    <RouterLink v-if="currentBook" class="text-link" to="/">Voltar ao feed</RouterLink>
  </section>

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

          <button
            v-if="getChapterStatus(chapter) === 'NOT_STARTED'"
            class="secondary-action"
            type="button"
            @click="platformStore.startChapter(chapter.id)"
          >
            Iniciar
          </button>

          <button
            v-else-if="getChapterStatus(chapter) === 'STARTED'"
            class="primary-action chapter-action"
            type="button"
            @click="platformStore.finishChapter(chapter.id)"
          >
            Concluir
          </button>
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
