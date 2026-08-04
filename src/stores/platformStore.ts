import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiRequest } from '../services/apiClient'
import type {
  Activity,
  AuthUser,
  BookRatings,
  Chapter,
  ChapterComment,
  ChapterCommentReactionType,
  ClubState,
  FinishedBook,
  ProfileStats
} from '../types/platform'

interface UsersResponse {
  users: AuthUser[]
}

interface ActivitiesResponse {
  activities: Activity[]
  hasMore: boolean
}

interface AlertsResponse {
  alerts: Activity[]
  hasMore: boolean
}

/** Tamanho do lote do feed (deve casar com o take do backend). */
const ACTIVITIES_PAGE_SIZE = 30

/** Marca até quando o sininho já foi visto (badge de não lidas). */
const ALERTS_SEEN_KEY = 'clubinho:alerts-seen'

function loadAlertsSeen(): string {
  try {
    return localStorage.getItem(ALERTS_SEEN_KEY) ?? ''
  } catch {
    return ''
  }
}

interface UserResponse {
  user: AuthUser
}

interface CurrentBookResponse extends ClubState {}

interface ChaptersResponse {
  chapters: Chapter[]
}

interface HistoryResponse {
  books: FinishedBook[]
}

export const usePlatformStore = defineStore('platform', () => {
  const clubState = ref<ClubState>({ currentBook: null, activities: [] })
  const members = ref<AuthUser[]>([])
  const history = ref<FinishedBook[]>([])
  const isLoading = ref(false)

  // Diferencia "sem livro atual" de "ainda não sei": quem trava decisão no
  // livro atual (ex.: sorteio) precisa poder falhar fechado antes da 1ª carga.
  const hasLoadedClubState = ref(false)

  // Contadores do perfil: vêm prontos do servidor porque o cliente não tem os
  // dados para somar (livro atual não traz comentários; histórico só traz
  // livros finalizados).
  const profileStats = ref<ProfileStats>({ chaptersRead: 0, comments: 0 })
  const isLoadingProfileStats = ref(false)

  // Feed com scroll infinito: o primeiro lote vem no /api/books/current e os
  // próximos por /api/activities (cursor = id da última atividade carregada).
  const activitiesHasMore = ref(false)
  const isLoadingMoreActivities = ref(false)

  // Filtros do feed (aplicados no servidor). Vazio = feed completo do livro atual.
  const feedQuery = ref('')
  const feedChapterId = ref<string | null>(null)
  const isFilteringFeed = ref(false)

  /** Query string do feed, propagando busca/capítulo ativos (e o cursor). */
  function feedQueryString(cursor: string | null): string {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    params.set('limit', String(ACTIVITIES_PAGE_SIZE))

    const q = feedQuery.value.trim()
    if (q) params.set('q', q)
    if (feedChapterId.value) params.set('chapterId', feedChapterId.value)

    return params.toString()
  }

  // Sininho (modal): alertas de progresso/marcos, separados do feed.
  const alerts = ref<Activity[]>([])
  const alertsHasMore = ref(false)
  const isLoadingMoreAlerts = ref(false)
  const alertsSeenAt = ref(loadAlertsSeen())

  // Não lidos = mais novos do que a última vez que o sininho foi aberto.
  const unreadAlertsCount = computed(
    () => alerts.value.filter((item) => item.createdAt > alertsSeenAt.value).length
  )

  async function loadHome() {
    isLoading.value = true
    // O primeiro lote vem sem filtro; zera a busca/capítulo para o estado bater
    // com a lista carregada.
    feedQuery.value = ''
    feedChapterId.value = null

    try {
      clubState.value = await apiRequest<CurrentBookResponse>('/api/books/current')
      hasLoadedClubState.value = true
      // Se veio o lote cheio, provavelmente há mais páginas para o feed.
      activitiesHasMore.value = clubState.value.activities.length >= ACTIVITIES_PAGE_SIZE
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Aplica busca/filtro do feed no servidor: recarrega a 1ª página com os
   * filtros e substitui a lista. `loadMoreActivities` propaga os mesmos filtros.
   */
  async function applyFeedFilter(q: string, chapterId: string | null) {
    feedQuery.value = q
    feedChapterId.value = chapterId
    isFilteringFeed.value = true

    try {
      const response = await apiRequest<ActivitiesResponse>(`/api/activities?${feedQueryString(null)}`)
      clubState.value.activities = response.activities
      activitiesHasMore.value = response.hasMore
    } finally {
      isFilteringFeed.value = false
    }
  }

  /** Carrega a próxima página do feed. Retorna se ainda há mais para carregar. */
  async function loadMoreActivities(): Promise<boolean> {
    if (isLoadingMoreActivities.value || !activitiesHasMore.value) {
      return false
    }

    const last = clubState.value.activities[clubState.value.activities.length - 1]
    if (!last) {
      activitiesHasMore.value = false
      return false
    }

    isLoadingMoreActivities.value = true

    try {
      const response = await apiRequest<ActivitiesResponse>(
        `/api/activities?${feedQueryString(last.id)}`
      )

      const seen = new Set(clubState.value.activities.map((activity) => activity.id))
      const fresh = response.activities.filter((activity) => !seen.has(activity.id))
      clubState.value.activities.push(...fresh)

      activitiesHasMore.value = response.hasMore && fresh.length > 0
      return activitiesHasMore.value
    } catch {
      // Falhou a página: para o scroll infinito para não repetir o erro em loop.
      activitiesHasMore.value = false
      return false
    } finally {
      isLoadingMoreActivities.value = false
    }
  }

  /** Carrega o primeiro lote do sininho (alertas). */
  async function loadAlerts() {
    const response = await apiRequest<AlertsResponse>(`/api/alerts?limit=${ACTIVITIES_PAGE_SIZE}`)
    alerts.value = response.alerts
    alertsHasMore.value = response.hasMore
  }

  /** Próxima página do sininho. Retorna se ainda há mais. */
  async function loadMoreAlerts(): Promise<boolean> {
    if (isLoadingMoreAlerts.value || !alertsHasMore.value) {
      return false
    }

    const last = alerts.value[alerts.value.length - 1]
    if (!last) {
      alertsHasMore.value = false
      return false
    }

    isLoadingMoreAlerts.value = true

    try {
      const response = await apiRequest<AlertsResponse>(
        `/api/alerts?cursor=${encodeURIComponent(last.id)}&limit=${ACTIVITIES_PAGE_SIZE}`
      )

      const seen = new Set(alerts.value.map((item) => item.id))
      const fresh = response.alerts.filter((item) => !seen.has(item.id))
      alerts.value.push(...fresh)

      alertsHasMore.value = response.hasMore && fresh.length > 0
      return alertsHasMore.value
    } catch {
      alertsHasMore.value = false
      return false
    } finally {
      isLoadingMoreAlerts.value = false
    }
  }

  /** Marca o sininho como visto (zera o badge de não lidos). */
  function markAlertsSeen() {
    const newest = alerts.value[0]?.createdAt
    if (!newest) {
      return
    }

    alertsSeenAt.value = newest
    try {
      localStorage.setItem(ALERTS_SEEN_KEY, newest)
    } catch {
      // Sem localStorage (ex.: navegação privada): o badge some só na sessão.
    }
  }

  async function loadMembers() {
    const response = await apiRequest<UsersResponse>('/api/admin/users')
    members.value = response.users
  }

  async function createMember(login: string, password: string, displayName: string) {
    const response = await apiRequest<UserResponse>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ login, password, displayName })
    })

    members.value = [response.user, ...members.value]
    return response.user
  }

  async function updateMember(
    userId: string,
    changes: { deactivated?: boolean; newPassword?: string }
  ) {
    const response = await apiRequest<UserResponse>(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(changes)
    })

    members.value = members.value.map((member) =>
      member.id === response.user.id ? response.user : member
    )
    return response.user
  }

  async function updateChapter(chapterId: string, changes: { number?: number; title?: string }) {
    await apiRequest(`/api/admin/chapters/${chapterId}`, {
      method: 'PATCH',
      body: JSON.stringify(changes)
    })
    await loadHome()
  }

  async function deleteChapter(chapterId: string) {
    await apiRequest(`/api/admin/chapters/${chapterId}`, { method: 'DELETE' })
    await loadHome()
  }

  /**
   * `extras` carrega o que vem da busca externa de livro: a capa e quantos
   * capítulos criar junto. A contagem não é guardada em campo nenhum — o
   * servidor só usa para decidir quantas linhas de Chapter nascem.
   */
  async function selectCurrentBook(
    title: string,
    author: string,
    description: string,
    extras: { coverUrl?: string | null; chapterCount?: number } = {}
  ) {
    await apiRequest('/api/books/current', {
      method: 'POST',
      body: JSON.stringify({ title, author, description, ...extras })
    })
    await loadHome()
  }

  async function createChapter(number: number, title: string) {
    await apiRequest<ChaptersResponse>('/api/admin/chapters', {
      method: 'POST',
      body: JSON.stringify({ number, title })
    })
    await loadHome()
  }

  async function startChapter(chapterId: string) {
    await apiRequest(`/api/chapters/${chapterId}/start`, { method: 'POST' })
    await loadHome()
  }

  async function finishChapter(
    chapterId: string,
    payload: { rating: number; finishedAt?: string }
  ) {
    await apiRequest(`/api/chapters/${chapterId}/finish`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    await loadHome()
  }

  async function reopenChapter(chapterId: string) {
    await apiRequest(`/api/chapters/${chapterId}/reopen`, { method: 'POST' })
    await loadHome()
  }

  async function rateChapter(chapterId: string, rating: number) {
    await apiRequest(`/api/chapters/${chapterId}/rating`, {
      method: 'POST',
      body: JSON.stringify({ rating })
    })
    await loadHome()
  }

  async function finishCurrentBook() {
    await apiRequest('/api/admin/current-book/finish', { method: 'POST' })
    await loadHome()
  }

  async function submitReview(rating: number, review: string) {
    await apiRequest('/api/books/review', {
      method: 'POST',
      body: JSON.stringify({ rating, review })
    })
    await loadHome()
  }

  /** Capítulos concluídos e comentários do membro logado, somando todos os livros. */
  async function loadProfileStats() {
    isLoadingProfileStats.value = true

    try {
      profileStats.value = await apiRequest<ProfileStats>('/api/profile/stats')
    } finally {
      isLoadingProfileStats.value = false
    }
  }

  async function loadHistory() {
    isLoading.value = true

    try {
      const response = await apiRequest<HistoryResponse>('/api/books/history')
      history.value = response.books
    } finally {
      isLoading.value = false
    }
  }

  /** Comentários de um capítulo (anti-spoiler: 403 se não concluído). */
  async function loadChapterComments(chapterId: string): Promise<ChapterComment[]> {
    const response = await apiRequest<{ comments: ChapterComment[] }>(
      `/api/chapters/${chapterId}/comments`
    )
    return response.comments
  }

  /** Cria/edita o comentário do membro no capítulo; devolve a lista atualizada. */
  async function submitChapterComment(chapterId: string, body: string): Promise<ChapterComment[]> {
    const response = await apiRequest<{ comments: ChapterComment[] }>(
      `/api/chapters/${chapterId}/comments`,
      { method: 'POST', body: JSON.stringify({ body }) }
    )
    return response.comments
  }

  async function reactToComment(
    commentId: string,
    type: ChapterCommentReactionType
  ): Promise<void> {
    await apiRequest(`/api/comments/${commentId}/reaction`, {
      method: 'POST',
      body: JSON.stringify({ type })
    })
  }

  /** Heatmap de avaliação por capítulo de um livro (atual ou finalizado). */
  async function loadBookRatings(clubBookId: string): Promise<BookRatings> {
    return apiRequest<BookRatings>(`/api/books/${clubBookId}/ratings`)
  }

  return {
    clubState,
    hasLoadedClubState,
    members,
    history,
    isLoading,
    activitiesHasMore,
    isLoadingMoreActivities,
    feedQuery,
    feedChapterId,
    isFilteringFeed,
    applyFeedFilter,
    alerts,
    alertsHasMore,
    isLoadingMoreAlerts,
    unreadAlertsCount,
    loadHome,
    profileStats,
    isLoadingProfileStats,
    loadProfileStats,
    loadMoreActivities,
    loadAlerts,
    loadMoreAlerts,
    markAlertsSeen,
    loadHistory,
    loadMembers,
    createMember,
    updateMember,
    selectCurrentBook,
    createChapter,
    updateChapter,
    deleteChapter,
    startChapter,
    finishChapter,
    reopenChapter,
    rateChapter,
    finishCurrentBook,
    submitReview,
    loadChapterComments,
    submitChapterComment,
    reactToComment,
    loadBookRatings
  }
})
