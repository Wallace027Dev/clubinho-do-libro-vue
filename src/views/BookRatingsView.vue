<script setup lang="ts">
import { Lock } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import BookCover from '../components/ui/BookCover.vue'
import DetailHeader from '../components/ui/DetailHeader.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import StarRating from '../components/ui/StarRating.vue'
import { ApiError } from '../services/apiClient'
import { usePlatformStore } from '../stores/platformStore'
import type { BookRatings, ChapterRatingSummary } from '../types/platform'
import { chapterShortTag, chapterTag } from '../utils/chapters'
import { formatRating } from '../utils/format'

const route = useRoute()
const platformStore = usePlatformStore()

const data = ref<BookRatings | null>(null)
const errorMessage = ref('')
const isLoading = ref(true)

// Faixas de satisfação (média/5): alinhadas à paleta do clube.
const bands = [
  { min: 4.5, key: 'incrivel', label: 'Incrível', range: '4,5–5,0' },
  { min: 4.0, key: 'otimo', label: 'Ótimo', range: '4,0–4,4' },
  { min: 3.0, key: 'mediano', label: 'Mediano', range: '3,0–3,9' },
  { min: 2.0, key: 'ruim', label: 'Ruim', range: '2,0–2,9' },
  { min: 0, key: 'pessimo', label: 'Péssimo', range: '< 2,0' }
] as const

onMounted(async () => {
  try {
    data.value = await platformStore.loadBookRatings(String(route.params.clubBookId))
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError ? error.message : 'Não foi possível carregar as avaliações.'
  } finally {
    isLoading.value = false
  }
})

const averageLabel = computed(() => {
  const average = data.value?.reviewSummary.average
  return average == null ? null : formatRating(average)
})

const satisfactionLabel = computed(() => {
  const average = data.value?.reviewSummary.average
  return average == null ? null : `${Math.round((average / 5) * 100)}%`
})

function bandFor(average: number) {
  return bands.find((band) => average >= band.min) ?? bands[bands.length - 1]
}

function tileClass(chapter: ChapterRatingSummary) {
  if (chapter.locked) {
    return 'rating-tile--locked'
  }

  if (chapter.average == null) {
    return 'rating-tile--empty'
  }

  return `rating-tile--${bandFor(chapter.average).key}`
}

function tileAverage(chapter: ChapterRatingSummary) {
  return chapter.average == null ? '—' : formatRating(chapter.average)
}

function satisfaction(chapter: ChapterRatingSummary) {
  return chapter.average == null ? null : `${Math.round((chapter.average / 5) * 100)}%`
}

function tileAriaLabel(chapter: ChapterRatingSummary) {
  if (chapter.locked) {
    return `${chapterTag(chapter)}: conclua para ver a média`
  }

  if (chapter.average == null) {
    return `${chapterTag(chapter)}: ainda sem notas`
  }

  return `${chapterTag(chapter)}: média ${tileAverage(chapter)} de 5, satisfação ${satisfaction(chapter)}`
}
</script>

<template>
  <DetailHeader title="Avaliação por capítulo" fallback="/chapters" />

  <EmptyState v-if="isLoading" message="Carregando avaliações..." />

  <SectionCard v-else-if="errorMessage">
    <EmptyState :message="errorMessage" />
  </SectionCard>

  <template v-else-if="data">
    <SectionCard class="history-card">
      <div class="history-head">
        <BookCover :title="data.book.title" :cover-url="data.book.coverUrl" />

        <div class="history-info">
          <p class="section-label">
            {{ data.book.status === 'FINISHED' ? 'Livro finalizado' : 'Livro atual' }}
          </p>
          <h3>{{ data.book.title }}</h3>
          <p v-if="data.book.author" class="history-author">{{ data.book.author }}</p>

          <template v-if="averageLabel">
            <p class="review-stars">
              <StarRating :value="data.reviewSummary.average!" :size="18" />
            </p>
            <p class="history-stats">
              {{ averageLabel }}/5 · satisfação do clube {{ satisfactionLabel }}
            </p>
          </template>
          <p v-else class="comment-muted">O livro ainda não recebeu avaliações.</p>
        </div>
      </div>
    </SectionCard>

    <SectionCard
      label="Capítulos"
      title="Média do clube por capítulo"
      :subtitle="data.book.status === 'CURRENT'
        ? 'Você só vê a média dos capítulos que já concluiu — sem spoiler de reação.'
        : undefined"
    >
      <div v-if="data.chapters.length" class="rating-grid">
        <div
          v-for="chapter in data.chapters"
          :key="chapter.id"
          class="rating-tile"
          :class="tileClass(chapter)"
          role="img"
          :aria-label="tileAriaLabel(chapter)"
          :title="chapter.title"
        >
          <strong>{{ chapterShortTag(chapter) }}</strong>
          <Lock v-if="chapter.locked" :size="16" aria-hidden="true" />
          <span v-else>{{ tileAverage(chapter) }}</span>
          <small v-if="!chapter.locked && chapter.average != null">
            {{ satisfaction(chapter) }}
          </small>
        </div>
      </div>

      <EmptyState v-else message="Este livro não tem capítulos cadastrados." />

      <ul class="rating-legend">
        <li v-for="band in bands" :key="band.key">
          <span class="rating-legend__swatch" :class="`rating-tile--${band.key}`"></span>
          <span class="rating-legend__range">{{ band.range }}</span>
          <span>{{ band.label }}</span>
        </li>
        <li>
          <span class="rating-legend__swatch rating-tile--locked"></span>
          <span class="rating-legend__range"><Lock :size="12" aria-hidden="true" /></span>
          <span>Conclua o capítulo para ver</span>
        </li>
      </ul>
    </SectionCard>
  </template>
</template>
