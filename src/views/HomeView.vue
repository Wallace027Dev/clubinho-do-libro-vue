<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePlatformStore } from '../stores/platformStore'

const platformStore = usePlatformStore()
const currentBook = computed(() => platformStore.clubState.currentBook)

const chapterStats = computed(() => {
  const chapters = currentBook.value?.chapters ?? []
  const finished = chapters.filter((chapter) => chapter.progress[0]?.status === 'FINISHED').length
  return { total: chapters.length, finished }
})

const averageLabel = computed(() => {
  const average = currentBook.value?.reviewSummary?.average
  return average == null ? null : average.toFixed(1).replace('.', ',')
})

onMounted(() => {
  void platformStore.loadHome()
})
</script>

<template>
  <section class="glass-panel current-book">
    <div>
      <p class="section-label">Livro atual</p>
      <h2 v-if="currentBook">{{ currentBook.book.title }}</h2>
      <h2 v-else>Nenhum livro em andamento</h2>

      <p v-if="currentBook">
        <span v-if="currentBook.book.author">De {{ currentBook.book.author }} · </span>
        Em leitura desde {{ new Date(currentBook.selectedAt).toLocaleDateString('pt-BR') }}.
        <span v-if="averageLabel"> · Nota do clube {{ averageLabel }}/5</span>
      </p>
      <p v-else>Quando o administrador definir o proximo livro, ele aparece aqui.</p>
    </div>

    <div v-if="platformStore.isLoading && !currentBook" class="empty-state">
      <p>Carregando o livro do clube...</p>
    </div>

    <template v-if="currentBook">
      <div class="home-progress">
        <p class="section-label">Seu progresso</p>
        <p v-if="chapterStats.total">
          <strong>{{ chapterStats.finished }}</strong> de
          <strong>{{ chapterStats.total }}</strong> capitulos concluidos.
        </p>
        <p v-else>O admin ainda nao cadastrou os capitulos deste livro.</p>

        <div
          v-if="chapterStats.total"
          class="progress-track"
          role="progressbar"
          :aria-valuemin="0"
          :aria-valuemax="chapterStats.total"
          :aria-valuenow="chapterStats.finished"
          aria-label="Capitulos concluidos"
        >
          <div
            class="progress-fill"
            :style="{ width: `${(chapterStats.finished / chapterStats.total) * 100}%` }"
          ></div>
        </div>
      </div>

      <div class="action-stack">
        <RouterLink class="text-link" to="/chapters">Ir para meus capitulos</RouterLink>
        <RouterLink class="text-link" to="/feed">Ver o feed do clube</RouterLink>
      </div>
    </template>
  </section>
</template>
