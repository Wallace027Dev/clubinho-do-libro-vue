/**
 * Roteador do mock de homologação: replica o comportamento das funções
 * serverless em `/api` sobre o "banco" em memória (`db.ts`).
 *
 * A ideia é ser fiel ao backend real — mesmos formatos de resposta, mesmos
 * códigos de status e as mesmas regras (anti-spoiler, gates de avaliação) —
 * para que o app não perceba a diferença em homologação.
 */
import {
  ADMIN_PASSWORD,
  REACTION_TYPES,
  getDb,
  persist,
  uid,
  type MockActivityMeta,
  type MockChapter,
  type MockClubBook,
  type ReactionType,
  type MockSession
} from './db'

export interface MockResponse {
  status: number
  body: unknown
}

function json(status: number, body: unknown): MockResponse {
  return { status, body }
}

function err(status: number, message: string): MockResponse {
  return { status, body: { error: message } }
}

const nowIso = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// Helpers de leitura sobre o "banco".
// ---------------------------------------------------------------------------

function userView(userId: string | null) {
  if (!userId) return null
  const user = getDb().users.find((item) => item.id === userId)
  if (!user) return null
  return {
    id: user.id,
    login: user.login,
    role: user.role,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl
  }
}

function actorView(actorId: string | null) {
  if (!actorId) return null
  const user = getDb().users.find((item) => item.id === actorId)
  if (!user) return null
  return {
    id: user.id,
    login: user.login,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl
  }
}

function getCurrentClubBook(): MockClubBook | null {
  return getDb().clubBooks.find((item) => item.status === 'CURRENT') ?? null
}

function chaptersOf(clubBookId: string): MockChapter[] {
  return getDb()
    .chapters.filter((item) => item.clubBookId === clubBookId)
    .sort((a, b) => a.number - b.number)
}

function progressFor(chapterId: string, userId: string | null) {
  if (!userId) return null
  return getDb().progress.find((item) => item.chapterId === chapterId && item.userId === userId) ?? null
}

function userFinishedAllChapters(clubBookId: string, userId: string): boolean {
  const chapters = chaptersOf(clubBookId)
  if (chapters.length === 0) return false
  return chapters.every((chapter) => progressFor(chapter.id, userId)?.status === 'FINISHED')
}

function userRatedAllChapters(clubBookId: string, userId: string): boolean {
  const chapters = chaptersOf(clubBookId)
  if (chapters.length === 0) return false
  return chapters.every((chapter) =>
    getDb().ratings.some((rating) => rating.chapterId === chapter.id && rating.userId === userId)
  )
}

/** Capítulo do livro ATUAL que o usuário já concluiu (libera nota/comentário). */
function getFinishedChapterForUser(chapterId: string, userId: string): MockChapter | null {
  const chapter = getDb().chapters.find((item) => item.id === chapterId)
  if (!chapter) return null
  const clubBook = getDb().clubBooks.find((item) => item.id === chapter.clubBookId)
  if (!clubBook || clubBook.status !== 'CURRENT') return null
  if (progressFor(chapterId, userId)?.status !== 'FINISHED') return null
  return chapter
}

function isStandaloneTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase()
  return ['prólogo', 'prologo', 'epílogo', 'epilogo'].includes(normalized)
}

function chapterMessageLabel(chapter: MockChapter): string {
  return isStandaloneTitle(chapter.title)
    ? `o ${chapter.title.trim().toLowerCase()}`
    : `o capítulo ${chapter.number}`
}

function countReactions(types: ReactionType[]): Partial<Record<ReactionType, number>> {
  return types.reduce<Partial<Record<ReactionType, number>>>((acc, type) => {
    acc[type] = (acc[type] ?? 0) + 1
    return acc
  }, {})
}

function commentsPayload(chapterId: string, viewerId: string | null) {
  const comments = getDb()
    .comments.filter((comment) => comment.chapterId === chapterId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return comments.map((comment) => {
    const reactions = getDb()
      .reactions.filter((reaction) => reaction.commentId === comment.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    return {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: actorView(comment.userId),
      myReaction: reactions.find((reaction) => reaction.userId === viewerId)?.type ?? null,
      reactions: countReactions(reactions.map((reaction) => reaction.type)),
      reactionTotal: reactions.length,
      recentReactions: reactions.slice(0, 6).map((reaction) => ({
        type: reaction.type,
        updatedAt: reaction.updatedAt
      }))
    }
  })
}

function reviewsPayload(clubBookId: string) {
  const reviews = getDb()
    .reviews.filter((review) => review.clubBookId === clubBookId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((review) => ({
      id: review.id,
      rating: review.rating,
      review: review.review,
      createdAt: review.createdAt,
      user: actorView(review.userId)
    }))

  const count = reviews.length
  const average = count ? reviews.reduce((sum, review) => sum + review.rating, 0) / count : null

  return { reviews, reviewSummary: { average, count } }
}

function addActivity(
  actorId: string | null,
  type: string,
  message: string,
  metadata: MockActivityMeta | null = null
) {
  getDb().activities.push({
    id: uid(),
    actorId,
    type,
    message,
    metadata,
    createdAt: nowIso()
  })
}

function recentActivities() {
  return getDb()
    .activities.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30)
    .map((activity) => ({
      id: activity.id,
      type: activity.type,
      message: activity.message,
      createdAt: activity.createdAt,
      actor: actorView(activity.actorId),
      metadata: activity.metadata
    }))
}

function chapterForCurrentPayload(chapter: MockChapter, userId: string | null) {
  const progress = progressFor(chapter.id, userId)
  const rating = userId
    ? getDb().ratings.find((item) => item.chapterId === chapter.id && item.userId === userId)
    : undefined

  return {
    id: chapter.id,
    number: chapter.number,
    title: chapter.title,
    progress: progress
      ? [{ status: progress.status, startedAt: progress.startedAt, finishedAt: progress.finishedAt }]
      : [],
    ratings: rating ? [{ rating: rating.rating }] : []
  }
}

function resolveFinishedAt(raw: unknown): string {
  const now = new Date()
  if (typeof raw !== 'string' || !raw) return now.toISOString()
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() > now.getTime()) {
    return now.toISOString()
  }
  return parsed.toISOString()
}

// ---------------------------------------------------------------------------
// Guards de sessão.
// ---------------------------------------------------------------------------

function session(): MockSession | null {
  return getDb().session
}

// ---------------------------------------------------------------------------
// Roteador principal.
// ---------------------------------------------------------------------------

interface Body {
  [key: string]: unknown
}

export function handleMockRequest(method: string, rawPath: string, body: Body): MockResponse {
  const path = rawPath.split('?')[0]
  const seg = path.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  const m = method.toUpperCase()

  // --- Auth -----------------------------------------------------------------
  if (path === '/api/auth/login' && m === 'POST') return authLogin(body)
  if (path === '/api/admin/login' && m === 'POST') return adminLogin(body)
  if (path === '/api/auth/logout' && m === 'POST') return logout()
  if (path === '/api/auth/me' && m === 'GET') return me()

  // --- Books / feed ---------------------------------------------------------
  if (path === '/api/books/current' && m === 'GET') return getCurrent()
  if (path === '/api/books/current' && m === 'POST') return selectCurrent(body)
  if (path === '/api/admin/current-book/finish' && m === 'POST') return finishCurrentBook()
  if (path === '/api/books/history' && m === 'GET') return getHistory()
  if (path === '/api/books/review' && m === 'POST') return submitReview(body)
  if (seg[0] === 'books' && seg[2] === 'ratings' && m === 'GET') return getRatings(seg[1])

  // --- Chapters (progresso, nota, comentários) ------------------------------
  if (seg[0] === 'chapters' && seg[2] === 'start' && m === 'POST') return startChapter(seg[1])
  if (seg[0] === 'chapters' && seg[2] === 'finish' && m === 'POST') return finishChapter(seg[1], body)
  if (seg[0] === 'chapters' && seg[2] === 'reopen' && m === 'POST') return reopenChapter(seg[1])
  if (seg[0] === 'chapters' && seg[2] === 'rating' && m === 'POST') return rateChapter(seg[1], body)
  if (seg[0] === 'chapters' && seg[2] === 'comments' && m === 'GET') return listComments(seg[1])
  if (seg[0] === 'chapters' && seg[2] === 'comments' && m === 'POST') return upsertComment(seg[1], body)

  // --- Reactions ------------------------------------------------------------
  if (seg[0] === 'comments' && seg[2] === 'reaction' && m === 'POST') return reactToComment(seg[1], body)

  // --- Admin: membros -------------------------------------------------------
  if (path === '/api/admin/users' && m === 'GET') return listUsers()
  if (path === '/api/admin/users' && m === 'POST') return createUser(body)
  if (seg[0] === 'admin' && seg[1] === 'users' && seg[2] && m === 'PATCH') return updateUser(seg[2], body)

  // --- Admin: capítulos -----------------------------------------------------
  if (path === '/api/admin/chapters' && m === 'GET') return listAdminChapters()
  if (path === '/api/admin/chapters' && m === 'POST') return createChapter(body)
  if (seg[0] === 'admin' && seg[1] === 'chapters' && seg[2] && m === 'PATCH') return updateChapter(seg[2], body)
  if (seg[0] === 'admin' && seg[1] === 'chapters' && seg[2] && m === 'DELETE') return deleteChapter(seg[2])

  // --- Profile --------------------------------------------------------------
  if (path === '/api/profile' && m === 'PATCH') return updateProfile(body)
  if (path === '/api/profile/password' && m === 'POST') return changePassword(body)

  return err(404, 'Rota não encontrada no mock de homologação.')
}

// ---------------------------------------------------------------------------
// Auth.
// ---------------------------------------------------------------------------

function authLogin(body: Body): MockResponse {
  const login = typeof body.login === 'string' ? body.login.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!login || !password) return err(400, 'Login e senha são obrigatórios.')

  const user = getDb().users.find((item) => item.login === login)
  if (!user || user.password !== password) return err(401, 'Credenciais inválidas.')
  if (user.deactivatedAt) return err(403, 'Conta desativada. Fale com o administrador do clube.')

  getDb().session = { userId: user.id, role: user.role }
  persist()
  return json(200, { user: userView(user.id) })
}

function adminLogin(body: Body): MockResponse {
  if (body.password !== ADMIN_PASSWORD) return err(401, 'Senha administrativa inválida.')
  getDb().session = { userId: null, role: 'ADMIN' }
  persist()
  return json(200, { user: { id: null, login: 'admin', role: 'ADMIN', displayName: 'Admin' } })
}

function logout(): MockResponse {
  getDb().session = null
  persist()
  return json(200, { ok: true })
}

function me(): MockResponse {
  const current = session()
  if (!current) return json(200, { user: null })
  if (current.role === 'ADMIN' && !current.userId) {
    return json(200, { user: { id: null, login: 'admin', role: 'ADMIN', displayName: 'Admin' } })
  }
  return json(200, { user: userView(current.userId) })
}

// ---------------------------------------------------------------------------
// Books / feed.
// ---------------------------------------------------------------------------

function getCurrent(): MockResponse {
  const current = session()
  if (!current) return err(401, 'Unauthorized.')

  const clubBook = getCurrentClubBook()
  let currentBook = null

  if (clubBook) {
    const book = getDb().books.find((item) => item.id === clubBook.bookId)
    const { reviews, reviewSummary } = reviewsPayload(clubBook.id)
    const viewerFinished = current.userId
      ? userFinishedAllChapters(clubBook.id, current.userId)
      : false
    const safeReviews = viewerFinished
      ? reviews
      : reviews.map((review) => ({ ...review, review: null }))

    currentBook = {
      id: clubBook.id,
      status: clubBook.status,
      selectedAt: clubBook.selectedAt,
      finishedAt: clubBook.finishedAt,
      book: book
        ? {
            id: book.id,
            title: book.title,
            author: book.author,
            description: book.description,
            coverUrl: book.coverUrl
          }
        : null,
      chapters: chaptersOf(clubBook.id).map((chapter) =>
        chapterForCurrentPayload(chapter, current.userId)
      ),
      reviews: safeReviews,
      reviewSummary
    }
  }

  return json(200, { currentBook, activities: recentActivities() })
}

function selectCurrent(body: Body): MockResponse {
  const current = session()
  if (!current) return err(401, 'Unauthorized.')
  if (current.role !== 'ADMIN') return err(403, 'Admin access required.')

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return err(400, 'Título do livro é obrigatório.')
  if (getCurrentClubBook()) return err(409, 'Já existe um livro atual em andamento.')

  const book = {
    id: uid(),
    title,
    author: typeof body.author === 'string' && body.author.trim() ? body.author.trim() : null,
    description:
      typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null,
    coverUrl: null
  }
  getDb().books.push(book)

  const clubBook: MockClubBook = {
    id: uid(),
    bookId: book.id,
    status: 'CURRENT',
    selectedAt: nowIso(),
    finishedAt: null,
    selectedByUserId: current.userId,
    finishedByUserId: null
  }
  getDb().clubBooks.push(clubBook)

  addActivity(current.userId, 'BOOK_SELECTED', `${book.title} virou o livro atual do clube.`, {
    bookId: book.id
  })
  persist()

  return json(201, { currentBook: { ...clubBook, book } })
}

function finishCurrentBook(): MockResponse {
  const current = session()
  if (!current) return err(401, 'Unauthorized.')
  if (current.role !== 'ADMIN') return err(403, 'Admin access required.')

  const clubBook = getCurrentClubBook()
  if (!clubBook) return err(404, 'Não existe livro atual em andamento.')

  const book = getDb().books.find((item) => item.id === clubBook.bookId)
  clubBook.status = 'FINISHED'
  clubBook.finishedAt = nowIso()
  clubBook.finishedByUserId = current.userId

  addActivity(current.userId, 'BOOK_FINISHED', `${book?.title ?? 'O livro'} foi finalizado pelo clube.`, {
    bookId: clubBook.bookId
  })
  persist()

  return json(200, { finishedBook: { ...clubBook, book } })
}

function getHistory(): MockResponse {
  const current = session()
  if (!current) return err(401, 'Unauthorized.')

  const finished = getDb()
    .clubBooks.filter((item) => item.status === 'FINISHED')
    .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))

  const books = finished.map((clubBook) => {
    const book = getDb().books.find((item) => item.id === clubBook.bookId)
    const { reviews, reviewSummary } = reviewsPayload(clubBook.id)

    const archivedChapters = chaptersOf(clubBook.id).map((chapter) => {
      const comments = getDb()
        .comments.filter((comment) => comment.chapterId === chapter.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((comment) => {
          const reactions = getDb().reactions.filter((reaction) => reaction.commentId === comment.id)
          return {
            id: comment.id,
            body: comment.body,
            createdAt: comment.createdAt,
            user: actorView(comment.userId),
            reactions: countReactions(reactions.map((reaction) => reaction.type)),
            reactionTotal: reactions.length
          }
        })

      return { id: chapter.id, number: chapter.number, title: chapter.title, comments }
    })

    const commentCount = archivedChapters.reduce((total, chapter) => total + chapter.comments.length, 0)

    return {
      id: clubBook.id,
      selectedAt: clubBook.selectedAt,
      finishedAt: clubBook.finishedAt,
      book: book
        ? {
            id: book.id,
            title: book.title,
            author: book.author,
            description: book.description,
            coverUrl: book.coverUrl
          }
        : null,
      reviews,
      reviewSummary,
      chapters: archivedChapters,
      stats: {
        chapters: archivedChapters.length,
        comments: commentCount,
        reviewers: reviewSummary.count
      }
    }
  })

  return json(200, { books })
}

function getRatings(clubBookId: string): MockResponse {
  const current = session()
  if (!current) return err(401, 'Unauthorized.')

  const clubBook = getDb().clubBooks.find((item) => item.id === clubBookId)
  if (!clubBook) return err(404, 'Livro não encontrado no clube.')

  const book = getDb().books.find((item) => item.id === clubBook.bookId)
  const isFinishedBook = clubBook.status === 'FINISHED'

  const chapters = chaptersOf(clubBook.id).map((chapter) => {
    const ratings = getDb().ratings.filter((rating) => rating.chapterId === chapter.id)
    const viewerFinished = progressFor(chapter.id, current.userId)?.status === 'FINISHED'
    const visible = isFinishedBook || viewerFinished
    const count = ratings.length
    const average = count
      ? Math.round((ratings.reduce((sum, item) => sum + item.rating, 0) / count) * 10) / 10
      : null
    const myRating = ratings.find((item) => item.userId === current.userId)?.rating ?? null

    return {
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      locked: !visible,
      average: visible ? average : null,
      count: visible ? count : 0,
      myRating: visible ? myRating : null
    }
  })

  const { reviewSummary } = reviewsPayload(clubBook.id)

  return json(200, {
    book: {
      id: clubBook.id,
      status: clubBook.status,
      finishedAt: clubBook.finishedAt,
      title: book?.title ?? '',
      author: book?.author ?? null,
      coverUrl: book?.coverUrl ?? null
    },
    reviewSummary,
    chapters
  })
}

function submitReview(body: Body): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  const clubBook = getCurrentClubBook()
  if (!clubBook) return err(404, 'Não existe livro atual em andamento.')

  const book = getDb().books.find((item) => item.id === clubBook.bookId)
  const rating = Math.round(Number(body.rating) * 10) / 10
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return err(400, 'A nota deve ser um número entre 1 e 5.')
  }

  const review = typeof body.review === 'string' && body.review.trim() ? body.review.trim() : null
  if (review && review.length > 1000) {
    return err(400, 'A resenha deve ter até 1000 caracteres.')
  }

  if (!userFinishedAllChapters(clubBook.id, current.userId)) {
    return err(403, 'Conclua todos os capítulos para avaliar o livro.')
  }
  if (!userRatedAllChapters(clubBook.id, current.userId)) {
    return err(403, 'Dê sua nota a todos os capítulos antes de avaliar o livro.')
  }

  const existing = getDb().reviews.find(
    (item) => item.clubBookId === clubBook.id && item.userId === current.userId
  )

  let saved
  if (existing) {
    existing.rating = rating
    existing.review = review
    saved = existing
  } else {
    saved = {
      id: uid(),
      clubBookId: clubBook.id,
      userId: current.userId,
      rating,
      review,
      createdAt: nowIso()
    }
    getDb().reviews.push(saved)
  }

  const user = getDb().users.find((item) => item.id === current.userId)
  addActivity(
    current.userId,
    'BOOK_REVIEWED',
    `${user?.displayName || user?.login || 'Um membro'} avaliou ${book?.title ?? 'o livro'} com ${String(rating).replace('.', ',')}/5.`,
    { bookId: clubBook.bookId, rating }
  )
  persist()

  return json(200, { review: saved })
}

// ---------------------------------------------------------------------------
// Chapters: progresso, nota e comentários.
// ---------------------------------------------------------------------------

function currentChapter(chapterId: string): MockChapter | null {
  const chapter = getDb().chapters.find((item) => item.id === chapterId)
  if (!chapter) return null
  const clubBook = getDb().clubBooks.find((item) => item.id === chapter.clubBookId)
  if (!clubBook || clubBook.status !== 'CURRENT') return null
  return chapter
}

function startChapter(chapterId: string): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  const chapter = currentChapter(chapterId)
  if (!chapter) return err(404, 'Capítulo atual não encontrado.')

  const existing = progressFor(chapter.id, current.userId)
  if (existing) return json(200, { progress: existing })

  const progress = {
    id: uid(),
    chapterId: chapter.id,
    userId: current.userId,
    status: 'STARTED' as const,
    startedAt: nowIso(),
    finishedAt: null
  }
  getDb().progress.push(progress)

  const user = getDb().users.find((item) => item.id === current.userId)
  addActivity(
    current.userId,
    'CHAPTER_STARTED',
    `${user?.displayName || user?.login || 'Um membro'} iniciou ${chapterMessageLabel(chapter)}.`,
    { chapterId: chapter.id, chapterNumber: chapter.number, chapterTitle: chapter.title }
  )
  persist()

  return json(200, { progress })
}

function finishChapter(chapterId: string, body: Body): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  const chapter = currentChapter(chapterId)
  if (!chapter) return err(404, 'Capítulo atual não encontrado.')

  // Nota obrigatória na conclusão (fica registrada na atividade de fim).
  const rating = Math.round(Number(body.rating) * 10) / 10
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return err(400, 'Dê uma nota de 1 a 5 ao concluir o capítulo.')
  }

  const finishedAt = resolveFinishedAt(body.finishedAt)
  const existing = progressFor(chapter.id, current.userId)

  let progress
  if (existing) {
    existing.status = 'FINISHED'
    existing.finishedAt = finishedAt
    progress = existing
  } else {
    progress = {
      id: uid(),
      chapterId: chapter.id,
      userId: current.userId,
      status: 'FINISHED' as const,
      startedAt: finishedAt,
      finishedAt
    }
    getDb().progress.push(progress)
  }

  const existingRating = getDb().ratings.find(
    (item) => item.chapterId === chapter.id && item.userId === current.userId
  )
  if (existingRating) {
    existingRating.rating = rating
  } else {
    getDb().ratings.push({ id: uid(), chapterId: chapter.id, userId: current.userId, rating })
  }

  const user = getDb().users.find((item) => item.id === current.userId)
  addActivity(
    current.userId,
    'CHAPTER_FINISHED',
    `${user?.displayName || user?.login || 'Um membro'} terminou ${chapterMessageLabel(chapter)} e deu nota ${rating.toFixed(1).replace('.', ',')}.`,
    { chapterId: chapter.id, chapterNumber: chapter.number, chapterTitle: chapter.title, rating }
  )
  persist()

  return json(200, { progress })
}

function reopenChapter(chapterId: string): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  const chapter = currentChapter(chapterId)
  if (!chapter) return err(404, 'Capítulo atual não encontrado.')

  const existing = progressFor(chapter.id, current.userId)
  if (!existing || existing.status !== 'FINISHED') {
    return err(409, 'Só é possível desfazer a conclusão de um capítulo concluído.')
  }

  existing.status = 'STARTED'
  existing.finishedAt = null
  persist()

  return json(200, { progress: existing })
}

function rateChapter(chapterId: string, body: Body): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  const chapter = getFinishedChapterForUser(chapterId, current.userId)
  if (!chapter) return err(403, 'Conclua o capítulo antes de dar a sua nota.')

  const rating = Math.round(Number(body.rating) * 10) / 10
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return err(400, 'A nota deve ser um número entre 1 e 5.')
  }

  const existing = getDb().ratings.find(
    (item) => item.chapterId === chapter.id && item.userId === current.userId
  )

  let saved
  if (existing) {
    existing.rating = rating
    saved = existing
  } else {
    saved = { id: uid(), chapterId: chapter.id, userId: current.userId, rating }
    getDb().ratings.push(saved)
  }
  persist()

  return json(200, { rating: saved })
}

function listComments(chapterId: string): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  if (!getFinishedChapterForUser(chapterId, current.userId)) {
    return err(403, 'Comentários liberam apenas depois de concluir o capítulo.')
  }

  return json(200, { comments: commentsPayload(chapterId, current.userId) })
}

function upsertComment(chapterId: string, body: Body): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  const chapter = getFinishedChapterForUser(chapterId, current.userId)
  if (!chapter) return err(403, 'Comentários liberam apenas depois de concluir o capítulo.')

  const commentBody = typeof body.body === 'string' ? body.body.trim() : ''
  if (!commentBody) return err(400, 'Comentário vazio.')
  if (commentBody.length > 420) return err(400, 'Comentário deve ter até 420 caracteres.')

  const existing = getDb().comments.find(
    (item) => item.chapterId === chapterId && item.userId === current.userId
  )

  if (existing) {
    existing.body = commentBody
    existing.updatedAt = nowIso()
  } else {
    getDb().comments.push({
      id: uid(),
      chapterId,
      userId: current.userId,
      body: commentBody,
      createdAt: nowIso(),
      updatedAt: nowIso()
    })
  }

  const user = getDb().users.find((item) => item.id === current.userId)
  addActivity(
    current.userId,
    'CHAPTER_COMMENTED',
    `${user?.displayName || user?.login || 'Um membro'} comentou ${chapterMessageLabel(chapter)}.`,
    { chapterId, chapterNumber: chapter.number, chapterTitle: chapter.title }
  )
  persist()

  return json(201, { comments: commentsPayload(chapterId, current.userId) })
}

function reactToComment(commentId: string, body: Body): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  const comment = getDb().comments.find((item) => item.id === commentId)
  if (!comment) return err(403, 'Reação liberada apenas para quem concluiu o capítulo.')
  if (!getFinishedChapterForUser(comment.chapterId, current.userId)) {
    return err(403, 'Reação liberada apenas para quem concluiu o capítulo.')
  }

  const type = body.type as ReactionType
  if (!type || !REACTION_TYPES.includes(type)) return err(400, 'Reação inválida.')

  const existing = getDb().reactions.find(
    (item) => item.commentId === commentId && item.userId === current.userId
  )

  let reaction
  if (existing) {
    existing.type = type
    existing.updatedAt = nowIso()
    reaction = existing
  } else {
    reaction = { id: uid(), commentId, userId: current.userId, type, updatedAt: nowIso() }
    getDb().reactions.push(reaction)
  }
  persist()

  return json(200, { reaction })
}

// ---------------------------------------------------------------------------
// Admin: membros.
// ---------------------------------------------------------------------------

function requireAdmin(): MockSession | MockResponse {
  const current = session()
  if (!current) return err(401, 'Unauthorized.')
  if (current.role !== 'ADMIN') return err(403, 'Admin access required.')
  return current
}

function isResponse(value: MockSession | MockResponse): value is MockResponse {
  return 'status' in value
}

function memberView(userId: string) {
  const user = getDb().users.find((item) => item.id === userId)
  if (!user) return null
  return {
    id: user.id,
    login: user.login,
    role: user.role,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    deactivatedAt: user.deactivatedAt,
    createdAt: user.createdAt
  }
}

function listUsers(): MockResponse {
  const guard = requireAdmin()
  if (isResponse(guard)) return guard

  const users = getDb()
    .users.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((user) => memberView(user.id))

  return json(200, { users })
}

function createUser(body: Body): MockResponse {
  const guard = requireAdmin()
  if (isResponse(guard)) return guard

  const login = typeof body.login === 'string' ? body.login.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!login || password.length < 6) {
    return err(400, 'Informe login e senha com pelo menos 6 caracteres.')
  }
  if (getDb().users.some((item) => item.login === login)) {
    return err(409, 'Já existe um membro com esse login.')
  }

  const user = {
    id: uid(),
    login,
    password,
    role: 'MEMBER' as const,
    displayName: typeof body.displayName === 'string' && body.displayName.trim() ? body.displayName.trim() : null,
    avatarUrl: null,
    deactivatedAt: null,
    createdAt: nowIso()
  }
  getDb().users.push(user)

  addActivity(null, 'MEMBER_CREATED', `${user.displayName || user.login} entrou no clube.`, {
    userId: user.id
  })
  persist()

  return json(201, { user: memberView(user.id) })
}

function updateUser(userId: string, body: Body): MockResponse {
  const guard = requireAdmin()
  if (isResponse(guard)) return guard

  const user = getDb().users.find((item) => item.id === userId)
  if (!user) return err(404, 'Membro não encontrado.')

  let touched = false

  if (typeof body.deactivated === 'boolean') {
    user.deactivatedAt = body.deactivated ? nowIso() : null
    touched = true
  }

  if (body.newPassword !== undefined) {
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
    if (newPassword.length < 6) return err(400, 'A nova senha precisa ter pelo menos 6 caracteres.')
    user.password = newPassword
    touched = true
  }

  if (!touched) return err(400, 'Nada para atualizar.')

  persist()
  return json(200, { user: memberView(user.id) })
}

// ---------------------------------------------------------------------------
// Admin: capítulos.
// ---------------------------------------------------------------------------

function listAdminChapters(): MockResponse {
  const guard = requireAdmin()
  if (isResponse(guard)) return guard

  const clubBook = getCurrentClubBook()
  if (!clubBook) return err(404, 'Não existe livro atual em andamento.')

  return json(200, { chapters: chaptersOf(clubBook.id) })
}

function createChapter(body: Body): MockResponse {
  const guard = requireAdmin()
  if (isResponse(guard)) return guard

  const clubBook = getCurrentClubBook()
  if (!clubBook) return err(404, 'Não existe livro atual em andamento.')

  const number = Number(body.number)
  const title = typeof body.title === 'string' ? body.title.trim() : ''

  if (!Number.isInteger(number) || number < 0 || !title) {
    return err(400, 'Informe número (0 para prólogo) e título do capítulo.')
  }
  if (chaptersOf(clubBook.id).some((chapter) => chapter.number === number)) {
    return err(409, 'Já existe um capítulo com esse número neste livro.')
  }

  const chapter = { id: uid(), clubBookId: clubBook.id, number, title }
  getDb().chapters.push(chapter)
  persist()

  return json(201, { chapter })
}

function updateChapter(chapterId: string, body: Body): MockResponse {
  const guard = requireAdmin()
  if (isResponse(guard)) return guard

  const chapter = currentChapter(chapterId)
  if (!chapter) return err(404, 'Capítulo atual não encontrado.')

  let touched = false

  if (body.number !== undefined) {
    const number = Number(body.number)
    if (!Number.isInteger(number) || number < 0) return err(400, 'Número de capítulo inválido.')
    if (
      getDb().chapters.some(
        (item) => item.clubBookId === chapter.clubBookId && item.number === number && item.id !== chapter.id
      )
    ) {
      return err(409, 'Já existe um capítulo com esse número neste livro.')
    }
    chapter.number = number
    touched = true
  }

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return err(400, 'Título do capítulo não pode ficar vazio.')
    chapter.title = title
    touched = true
  }

  if (!touched) return err(400, 'Nada para atualizar.')

  persist()
  return json(200, { chapter })
}

function deleteChapter(chapterId: string): MockResponse {
  const guard = requireAdmin()
  if (isResponse(guard)) return guard

  const chapter = currentChapter(chapterId)
  if (!chapter) return err(404, 'Capítulo atual não encontrado.')

  const hasProgress = getDb().progress.some((item) => item.chapterId === chapter.id)
  const hasComments = getDb().comments.some((item) => item.chapterId === chapter.id)
  if (hasProgress || hasComments) {
    return err(409, 'Este capítulo já tem progresso ou comentários de membros e não pode ser excluído.')
  }

  getDb().chapters = getDb().chapters.filter((item) => item.id !== chapter.id)
  persist()

  return json(200, { ok: true })
}

// ---------------------------------------------------------------------------
// Profile.
// ---------------------------------------------------------------------------

function updateProfile(body: Body): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  const avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : ''
  if (avatarUrl && avatarUrl.length > 400_000) {
    return err(400, 'Imagem muito grande. Escolha uma foto menor.')
  }

  const user = getDb().users.find((item) => item.id === current.userId)
  if (!user) return err(404, 'Membro não encontrado.')

  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
  user.displayName = displayName || null
  user.avatarUrl = avatarUrl || null

  addActivity(user.id, 'PROFILE_UPDATED', `${user.displayName || user.login} atualizou o perfil.`)
  persist()

  return json(200, { user: userView(user.id) })
}

function changePassword(body: Body): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (newPassword.length < 6) return err(400, 'A nova senha precisa ter pelo menos 6 caracteres.')

  const user = getDb().users.find((item) => item.id === current.userId)
  if (!user || user.password !== currentPassword) return err(401, 'Senha atual incorreta.')

  user.password = newPassword
  persist()

  return json(200, { ok: true })
}
