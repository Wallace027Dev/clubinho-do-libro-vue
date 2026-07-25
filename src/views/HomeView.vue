<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import SkeletonLoader from '../components/ui/SkeletonLoader.vue'
import { usePlatformStore } from '../stores/platformStore'
import { formatRating } from '../utils/format'

const platformStore = usePlatformStore()
const currentBook = computed(() => platformStore.clubState.currentBook)

// Só a primeira carga (sem dado ainda) mostra skeleton; ao voltar para a Home
// com o clube já em memória, o conteúdo aparece na hora.
const hasLoaded = ref(false)
const showSkeleton = computed(() => !currentBook.value && !hasLoaded.value)

const chapterStats = computed(() => {
  const chapters = currentBook.value?.chapters ?? []
  const finished = chapters.filter((chapter) => chapter.progress[0]?.status === 'FINISHED').length
  return { total: chapters.length, finished }
})

const averageLabel = computed(() => {
  const average = currentBook.value?.reviewSummary?.average
  return average == null ? null : formatRating(average)
})

onMounted(async () => {
  try {
    await platformStore.loadHome()
  } finally {
    hasLoaded.value = true
  }
})
</script>

<template>
  <section class="glass-panel current-book">
    <!-- Carregando: placeholders no lugar do conteúdo, para não "pipocar". -->
    <SkeletonLoader
      v-if="showSkeleton"
      :rows="4"
      :columns="1"
      height="1.3rem"
      gap="14px"
      label="Carregando o livro do clube"
    />

    <template v-else>
      <div>
        <p class="section-label">Livro atual</p>
        <h2 v-if="currentBook">{{ currentBook.book.title }}</h2>
        <h2 v-else>Nenhum livro em andamento</h2>

        <p v-if="currentBook">
          <span v-if="currentBook.book.author">De {{ currentBook.book.author }} · </span>
          Em leitura desde {{ new Date(currentBook.selectedAt).toLocaleDateString('pt-BR') }}.
          <span v-if="averageLabel"> · Nota do clube {{ averageLabel }}/5</span>
        </p>
        <p v-else>Quando o administrador definir o próximo livro, ele aparece aqui.</p>
        <p v-if="currentBook?.book.description" class="hero-copy">
          {{ currentBook.book.description }}
        </p>
      </div>

      <template v-if="currentBook">
        <div class="home-progress">
          <p class="section-label">Seu progresso</p>
          <p v-if="chapterStats.total">
            <strong>{{ chapterStats.finished }}</strong> de
            <strong>{{ chapterStats.total }}</strong> capítulos concluídos.
          </p>
          <p v-else>O admin ainda não cadastrou os capítulos deste livro.</p>

          <div
            v-if="chapterStats.total"
            class="progress-track"
            role="progressbar"
            :aria-valuemin="0"
            :aria-valuemax="chapterStats.total"
            :aria-valuenow="chapterStats.finished"
            aria-label="Capítulos concluídos"
          >
            <div
              class="progress-fill"
              :style="{ width: `${(chapterStats.finished / chapterStats.total) * 100}%` }"
            ></div>
          </div>
        </div>

        <div class="action-stack">
          <RouterLink class="text-link" to="/chapters">Ir para meus capítulos</RouterLink>
          <RouterLink class="text-link" to="/feed">Ver o feed do clube</RouterLink>
        </div>
      </template>
    </template>
  </section>
</template>
