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
  getDb,
  persist,
  uid,
  type MockActivityMeta,
  type MockChapter,
  type MockClubBook,
  type MockSession
} from './db'
import { clearAttempts, isRateLimited, recordFailure } from './rateLimit'
import { averageRating } from '../../domain/rating'
import { everyChapterFinished, everyChapterRated, isChapterUnlocked } from '../../domain/chapterProgress'
import { chapterMessageLabel } from '../../domain/chapterLabel'
import {
  resolveChapterFinish,
  type ChapterFinishCommand
} from '../../domain/services/chapterFinish'
import {
  resolveChapterRating,
  type ChapterRatingCommand
} from '../../domain/services/chapterRating'
import { resolveBookReview, type BookReviewCommand } from '../../domain/services/bookReview'
import {
  COMMENT_LOCKED_ERROR,
  resolveChapterComment,
  type ChapterCommentCommand
} from '../../domain/services/chapterComment'
import {
  resolveCommentReaction,
  type CommentReactionCommand
} from '../../domain/services/commentReaction'
import {
  resolveCreateChapter,
  resolveDeleteChapter,
  resolveUpdateChapter
} from '../../domain/services/adminChapters'
import { normalizeLogin, resolveCreateUser, resolveUpdateUser } from '../../domain/services/adminMembers'
import { resolveFinishBook, resolveSelectBook } from '../../domain/services/adminBook'
import {
  bookFinishedNotification,
  commentReactionNotification,
  chapterCommentNotification,
  chapterFinishedNotification
} from '../../domain/notifications'
import { countReactionTypes } from '../../domain/reactions'
import { feedCommentView } from '../../domain/feedComment'
import { resolveBookSearchQuery, type ExternalBookSource } from '../../domain/bookSearch'
import { findFixtureBook, searchFixtureBooks } from './bookSearchSim'
import { simulateLocalPush } from './pushSim'
import { isAlertActivity, isFeedActivity } from '../../domain/activities'

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
  return everyChapterFinished(chapters.map((chapter) => progressFor(chapter.id, userId)?.status))
}

function userRatedAllChapters(clubBookId: string, userId: string): boolean {
  const chapters = chaptersOf(clubBookId)
  return everyChapterRated(
    chapters.map((chapter) =>
      getDb().ratings.some((rating) => rating.chapterId === chapter.id && rating.userId === userId)
    )
  )
}

/** Capítulo do livro ATUAL que o usuário já concluiu (libera nota/comentário). */
function getFinishedChapterForUser(chapterId: string, userId: string): MockChapter | null {
  const chapter = getDb().chapters.find((item) => item.id === chapterId)
  if (!chapter) return null
  const clubBook = getDb().clubBooks.find((item) => item.id === chapter.clubBookId)
  const unlocked = isChapterUnlocked({
    clubBookStatus: clubBook?.status,
    progressStatus: progressFor(chapterId, userId)?.status
  })
  return unlocked ? chapter : null
}

/** Contagem por tipo vem do domínio (mesma do backend real). */
const countReactions = countReactionTypes

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

  const average = averageRating(reviews.map((review) => review.rating))

  return { reviews, reviewSummary: { average, count: reviews.length } }
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

// Mesma ordem do backend real: data desc com id como desempate estável.
function sortedActivities(keep?: (type: string) => boolean) {
  const all = getDb()
    .activities.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
  return keep ? all.filter((activity) => keep(activity.type)) : all
}

/**
 * Reações do comentário do ator naquele capítulo — só para atividade de
 * comentário. Junção por (capítulo, autor), igual ao backend real, porque a
 * metadata não guarda o id do comentário.
 */
function commentReactionsOf(activity: {
  type: string
  actorId: string | null
  metadata: MockActivityMeta | null
}) {
  const chapterId = activity.metadata?.chapterId

  if (activity.type !== 'CHAPTER_COMMENTED' || !chapterId || !activity.actorId) {
    return {}
  }

  const comment = getDb().comments.find(
    (item) => item.chapterId === chapterId && item.userId === activity.actorId
  )

  if (!comment) {
    return {}
  }

  const reactions = getDb().reactions.filter((item) => item.commentId === comment.id)

  if (reactions.length === 0) {
    return {}
  }

  return {
    commentReactions: countReactions(reactions.map((item) => item.type)),
    commentReactionTotal: reactions.length
  }
}

/**
 * Id da atividade que representa a interação (mesma resolução do backend real:
 * a mais recente daquele tipo, do ator, naquele capítulo). É o que faz a
 * notificação abrir a página da interação em vez de uma lista.
 */
function activityIdFor(type: string, actorId: string | null, chapterId: string): string | null {
  if (!actorId) {
    return null
  }

  const found = sortedActivities((item) => item === type).find(
    (activity) => activity.actorId === actorId && activity.metadata?.chapterId === chapterId
  )

  return found?.id ?? null
}

function activityView(activity: { id: string; type: string; message: string; createdAt: string; actorId: string | null; metadata: MockActivityMeta | null }) {
  return {
    id: activity.id,
    type: activity.type,
    message: activity.message,
    createdAt: activity.createdAt,
    actor: actorView(activity.actorId),
    metadata: activity.metadata,
    ...commentReactionsOf(activity)
  }
}

/** Capítulos que o usuário já concluiu (para o anti-spoiler do feed). */
function finishedChapterIdsFor(userId: string | null): Set<string> {
  if (!userId) return new Set()
  return new Set(
    getDb()
      .progress.filter((item) => item.userId === userId && item.status === 'FINISHED')
      .map((item) => item.chapterId)
  )
}

/** Capítulos do livro atual (escopo do feed). */
function currentBookChapterIdSet(): Set<string> {
  const clubBook = getCurrentClubBook()
  if (!clubBook) return new Set()
  return new Set(chaptersOf(clubBook.id).map((chapter) => chapter.id))
}

/** Corpo do comentário do ator naquele capítulo (para o preview), se existir. */
function commentBodyOf(chapterId: string | undefined, actorId: string | null): string | null {
  if (!chapterId || !actorId) return null
  const comment = getDb().comments.find(
    (item) => item.chapterId === chapterId && item.userId === actorId
  )
  return comment?.body ?? null
}

/**
 * Feed = comentários de outros nos capítulos do livro atual. O anti-spoiler é
 * por card (`locked`), não some da lista. `q` busca na mensagem (autor +
 * capítulo); `chapterId` restringe a um capítulo do livro atual.
 */
function commentFeedFor(
  viewerId: string | null,
  opts: { q?: string | null; chapterId?: string | null } = {}
) {
  const bookChapters = currentBookChapterIdSet()
  const q = opts.q?.trim().toLowerCase()

  return sortedActivities(isFeedActivity).filter((activity) => {
    const chapterId = activity.metadata?.chapterId
    if (activity.actorId === viewerId || !chapterId || !bookChapters.has(chapterId)) return false
    if (opts.chapterId && chapterId !== opts.chapterId) return false
    if (q && !activity.message.toLowerCase().includes(q)) return false
    return true
  })
}

/** activityView + decisão anti-spoiler do feed (`locked`/`bodyPreview`) + `chapterId`. */
function feedActivityView(
  activity: {
    id: string
    type: string
    message: string
    createdAt: string
    actorId: string | null
    metadata: MockActivityMeta | null
  },
  finished: ReadonlySet<string>
) {
  const chapterId = activity.metadata?.chapterId ?? null
  const { locked, bodyPreview } = feedCommentView({
    finishedChapterIds: finished,
    chapterId,
    body: commentBodyOf(activity.metadata?.chapterId, activity.actorId)
  })

  return { ...activityView(activity), chapterId, locked, bodyPreview }
}

/** Alertas = progresso/marcos (canal alert) de outros usuários. */
function alertsFor(viewerId: string | null) {
  return sortedActivities(isAlertActivity).filter((activity) => activity.actorId !== viewerId)
}

function recentActivities(viewerId: string | null) {
  const finished = finishedChapterIdsFor(viewerId)
  return commentFeedFor(viewerId)
    .slice(0, 30)
    .map((activity) => feedActivityView(activity, finished))
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
  const [path, queryString] = rawPath.split('?')
  const query = new URLSearchParams(queryString ?? '')
  const seg = path.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  const m = method.toUpperCase()

  // --- Feed paginado --------------------------------------------------------
  if (path === '/api/activities' && m === 'GET') {
    return listActivities(
      query.get('cursor'),
      query.get('limit'),
      query.get('q'),
      query.get('chapterId')
    )
  }

  // --- Sininho (alertas de progresso/marcos) --------------------------------
  if (path === '/api/alerts' && m === 'GET') {
    return listAlerts(query.get('cursor'), query.get('limit'))
  }

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
  // Busca externa (homologação: catálogo fixo, sem rede — ver bookSearchSim).
  if (path === '/api/books/search' && m === 'GET') return searchExternalBooks(query.get('q'))
  if (path === '/api/books/external' && m === 'GET')
    return externalBookDetail(query.get('source'), query.get('id'))
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
  if (path === '/api/profile/stats' && m === 'GET') return profileStats()
  if (path === '/api/profile/password' && m === 'POST') return changePassword(body)

  // --- Push (homologação: sem servidor real; a simulação é local) -----------
  if (path === '/api/push/subscribe' && m === 'POST') return pushSubscribe()
  if (path === '/api/push/unsubscribe' && m === 'POST') return pushUnsubscribe()

  return err(404, 'Rota não encontrada no mock de homologação.')
}

// ---------------------------------------------------------------------------
// Auth.
// ---------------------------------------------------------------------------

function rateLimitError(key: string): MockResponse | null {
  const limit = isRateLimited(key)
  if (limit.limited) {
    return err(429, `Muitas tentativas. Tente novamente em ${limit.retryAfterSec}s.`)
  }
  return null
}

function authLogin(body: Body): MockResponse {
  const login = typeof body.login === 'string' ? body.login.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!login || !password) return err(400, 'Login e senha são obrigatórios.')

  const rateKey = `login:${login}`
  const limited = rateLimitError(rateKey)
  if (limited) return limited

  const user = getDb().users.find((item) => item.login === login)
  if (!user || user.password !== password) {
    recordFailure(rateKey)
    return err(401, 'Credenciais inválidas.')
  }

  clearAttempts(rateKey)
  if (user.deactivatedAt) return err(403, 'Conta desativada. Fale com o administrador do clube.')

  getDb().session = { userId: user.id, role: user.role }
  persist()
  return json(200, { user: userView(user.id) })
}

function adminLogin(body: Body): MockResponse {
  const limited = rateLimitError('admin')
  if (limited) return limited

  if (body.password !== ADMIN_PASSWORD) {
    recordFailure('admin')
    return err(401, 'Senha administrativa inválida.')
  }

  clearAttempts('admin')
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

  return json(200, { currentBook, activities: recentActivities(current.userId) })
}

function listActivities(
  cursor: string | null,
  limitRaw: string | null,
  q: string | null,
  chapterId: string | null
): MockResponse {
  const current = session()
  if (!current) return err(401, 'Unauthorized.')

  const parsedLimit = Number(limitRaw)
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 30

  const finished = finishedChapterIdsFor(current.userId)
  const sorted = commentFeedFor(current.userId, { q, chapterId })
  let start = 0
  if (cursor) {
    const index = sorted.findIndex((activity) => activity.id === cursor)
    start = index >= 0 ? index + 1 : sorted.length
  }

  const page = sorted.slice(start, start + limit)
  return json(200, {
    activities: page.map((activity) => feedActivityView(activity, finished)),
    hasMore: start + page.length < sorted.length
  })
}

/** Sininho (modal): alertas de progresso/marcos de outros, paginados. */
function listAlerts(cursor: string | null, limitRaw: string | null): MockResponse {
  const current = session()
  if (!current) return err(401, 'Unauthorized.')

  const parsedLimit = Number(limitRaw)
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 30

  const sorted = alertsFor(current.userId)
  let start = 0
  if (cursor) {
    const index = sorted.findIndex((activity) => activity.id === cursor)
    start = index >= 0 ? index + 1 : sorted.length
  }

  const page = sorted.slice(start, start + limit)
  return json(200, {
    alerts: page.map(activityView),
    hasMore: start + page.length < sorted.length
  })
}

/**
 * Busca de livro na homologação. As mensagens de erro e o gate de admin são os
 * mesmos da rota real (`api/_routes/books/search.ts`), e a validação do termo
 * vem do domínio — é o que garante que o 400 seja idêntico nos dois lados.
 */
function searchExternalBooks(rawTerm: string | null): MockResponse {
  const current = session()
  if (!current) return err(401, 'Unauthorized.')
  if (current.role !== 'ADMIN') return err(403, 'Admin access required.')

  const decision = resolveBookSearchQuery(rawTerm)
  if (!decision.ok) return err(decision.status, decision.error)

  const results = searchFixtureBooks(decision.term)

  return json(200, { provider: results[0]?.source ?? null, results })
}

function externalBookDetail(rawSource: string | null, rawId: string | null): MockResponse {
  const current = session()
  if (!current) return err(401, 'Unauthorized.')
  if (current.role !== 'ADMIN') return err(403, 'Admin access required.')

  const source =
    rawSource === 'google' || rawSource === 'openlibrary' ? (rawSource as ExternalBookSource) : null
  const id = rawId?.trim() ?? ''

  if (!source || !id) return err(400, 'Informe a fonte e o id do livro.')

  const book = findFixtureBook(source, id)

  if (!book) return err(404, 'Livro não encontrado no catálogo.')

  return json(200, { book })
}

function selectCurrent(body: Body): MockResponse {
  const current = session()
  if (!current) return err(401, 'Unauthorized.')
  if (current.role !== 'ADMIN') return err(403, 'Admin access required.')

  const decision = resolveSelectBook({
    hasCurrentBook: Boolean(getCurrentClubBook()),
    rawTitle: body.title,
    rawAuthor: body.author,
    rawDescription: body.description,
    rawCoverUrl: body.coverUrl,
    rawChapterCount: body.chapterCount
  })
  if (!decision.ok) return err(decision.status, decision.error)

  const book = {
    id: uid(),
    title: decision.command.title,
    author: decision.command.author,
    description: decision.command.description,
    coverUrl: decision.command.coverUrl
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

  // Mesmas linhas que o Prisma cria no createMany: o domínio já as resolveu.
  for (const chapter of decision.command.chapters) {
    getDb().chapters.push({
      id: uid(),
      clubBookId: clubBook.id,
      number: chapter.number,
      title: chapter.title
    })
  }

  addActivity(current.userId, decision.command.activity.type, decision.command.activity.message, {
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
  const book = clubBook ? getDb().books.find((item) => item.id === clubBook.bookId) : null

  const decision = resolveFinishBook({
    currentBook: clubBook
      ? { clubBookId: clubBook.id, bookId: clubBook.bookId, title: book?.title ?? 'O livro' }
      : null
  })
  if (!decision.ok) return err(decision.status, decision.error)

  clubBook!.status = 'FINISHED'
  clubBook!.finishedAt = nowIso()
  clubBook!.finishedByUserId = current.userId

  addActivity(
    current.userId,
    decision.command.activity.type,
    decision.command.activity.message,
    decision.command.activity.metadata
  )
  persist()

  // Homologação: simula o push de livro finalizado localmente.
  simulateLocalPush(bookFinishedNotification(book?.title ?? 'O livro'))

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

/** Adaptador de gravação do mock: upsert da avaliação + atividade no "banco". */
function commitMockBookReview(command: BookReviewCommand) {
  const existing = getDb().reviews.find(
    (item) => item.clubBookId === command.clubBookId && item.userId === command.userId
  )

  let saved
  if (existing) {
    existing.rating = command.rating
    existing.review = command.review
    saved = existing
  } else {
    saved = {
      id: uid(),
      clubBookId: command.clubBookId,
      userId: command.userId,
      rating: command.rating,
      review: command.review,
      createdAt: nowIso()
    }
    getDb().reviews.push(saved)
  }

  addActivity(command.userId, command.activity.type, command.activity.message, command.activity.metadata)
  return saved
}

function submitReview(body: Body): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  // Gates, validação e mensagem vivem no núcleo do domínio; o mock carrega os
  // dados/flags e grava — sem duplicar a lógica do backend real.
  const clubBook = getCurrentClubBook()
  const book = clubBook ? getDb().books.find((item) => item.id === clubBook.bookId) : null
  const actor = getDb().users.find((item) => item.id === current.userId) ?? null

  const decision = resolveBookReview({
    currentBook: clubBook
      ? { clubBookId: clubBook.id, bookId: clubBook.bookId, title: book?.title ?? 'o livro' }
      : null,
    actor: actor ? { displayName: actor.displayName, login: actor.login } : null,
    userId: current.userId,
    rawRating: body.rating,
    rawReview: body.review,
    finishedAllChapters: clubBook ? userFinishedAllChapters(clubBook.id, current.userId) : false,
    ratedAllChapters: clubBook ? userRatedAllChapters(clubBook.id, current.userId) : false
  })

  if (!decision.ok) return err(decision.status, decision.error)

  const saved = commitMockBookReview(decision.command)
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

/** Adaptador de gravação do mock: executa o comando do domínio no "banco". */
function commitMockChapterFinish(command: ChapterFinishCommand) {
  const finishedAt = command.finishedAt.toISOString()
  const existing = progressFor(command.chapterId, command.userId)

  let progress
  if (existing) {
    existing.status = 'FINISHED'
    existing.finishedAt = finishedAt
    progress = existing
  } else {
    progress = {
      id: uid(),
      chapterId: command.chapterId,
      userId: command.userId,
      status: 'FINISHED' as const,
      startedAt: finishedAt,
      finishedAt
    }
    getDb().progress.push(progress)
  }

  const existingRating = getDb().ratings.find(
    (item) => item.chapterId === command.chapterId && item.userId === command.userId
  )
  if (existingRating) {
    existingRating.rating = command.rating
  } else {
    getDb().ratings.push({
      id: uid(),
      chapterId: command.chapterId,
      userId: command.userId,
      rating: command.rating
    })
  }

  addActivity(command.userId, command.activity.type, command.activity.message, command.activity.metadata)
  return progress
}

function finishChapter(chapterId: string, body: Body): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  // Regras (gates, nota, mensagem, metadados) vivem no núcleo do domínio; o
  // mock só carrega os dados e grava — sem duplicar a lógica do backend real.
  const chapter = currentChapter(chapterId)
  const actor = getDb().users.find((item) => item.id === current.userId) ?? null

  const decision = resolveChapterFinish({
    chapter: chapter ? { id: chapter.id, number: chapter.number, title: chapter.title } : null,
    actor: actor ? { displayName: actor.displayName, login: actor.login } : null,
    userId: current.userId,
    rawRating: body.rating,
    rawFinishedAt: body.finishedAt
  })

  if (!decision.ok) return err(decision.status, decision.error)

  const progress = commitMockChapterFinish(decision.command)
  persist()

  // Homologação: simula o push de capítulo concluído localmente.
  simulateLocalPush(
    chapterFinishedNotification(
      actor?.displayName || actor?.login || 'Um membro',
      chapterMessageLabel(chapter!),
      activityIdFor('CHAPTER_FINISHED', current.userId, chapterId)
    )
  )

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

/** Adaptador de gravação do mock: upsert da nota no "banco". */
function commitMockChapterRating(command: ChapterRatingCommand) {
  const existing = getDb().ratings.find(
    (item) => item.chapterId === command.chapterId && item.userId === command.userId
  )

  if (existing) {
    existing.rating = command.rating
    return existing
  }

  const saved = {
    id: uid(),
    chapterId: command.chapterId,
    userId: command.userId,
    rating: command.rating
  }
  getDb().ratings.push(saved)
  return saved
}

function rateChapter(chapterId: string, body: Body): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  // Gate anti-spoiler + validação vivem no núcleo do domínio; o mock só
  // resolve o capítulo liberado e grava.
  const chapter = getFinishedChapterForUser(chapterId, current.userId)

  const decision = resolveChapterRating({
    chapter: chapter ? { id: chapter.id } : null,
    userId: current.userId,
    rawRating: body.rating
  })

  if (!decision.ok) return err(decision.status, decision.error)

  const saved = commitMockChapterRating(decision.command)
  persist()

  return json(200, { rating: saved })
}

function listComments(chapterId: string): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  // Gate anti-spoiler no domínio; o mock resolve o capítulo e serializa.
  if (!getFinishedChapterForUser(chapterId, current.userId)) {
    return err(403, COMMENT_LOCKED_ERROR)
  }

  return json(200, { comments: commentsPayload(chapterId, current.userId) })
}

/** Adaptador de gravação do mock: upsert do comentário + atividade. */
function commitMockChapterComment(command: ChapterCommentCommand) {
  const existing = getDb().comments.find(
    (item) => item.chapterId === command.chapterId && item.userId === command.userId
  )

  if (existing) {
    existing.body = command.body
    existing.updatedAt = nowIso()
  } else {
    getDb().comments.push({
      id: uid(),
      chapterId: command.chapterId,
      userId: command.userId,
      body: command.body,
      createdAt: nowIso(),
      updatedAt: nowIso()
    })
  }

  addActivity(command.userId, command.activity.type, command.activity.message, command.activity.metadata)
}

function upsertComment(chapterId: string, body: Body): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  const chapter = getFinishedChapterForUser(chapterId, current.userId)
  const actor = getDb().users.find((item) => item.id === current.userId) ?? null

  const decision = resolveChapterComment({
    chapter: chapter ? { id: chapter.id, number: chapter.number, title: chapter.title } : null,
    actor: actor ? { displayName: actor.displayName, login: actor.login } : null,
    userId: current.userId,
    rawBody: body.body
  })

  if (!decision.ok) return err(decision.status, decision.error)

  commitMockChapterComment(decision.command)
  persist()

  // Homologação: simula o push de novo comentário localmente.
  simulateLocalPush(
    chapterCommentNotification(
      actor?.displayName || actor?.login || 'Um membro',
      chapterMessageLabel(chapter!),
      activityIdFor('CHAPTER_COMMENTED', current.userId, chapterId)
    )
  )

  return json(201, { comments: commentsPayload(chapterId, current.userId) })
}

/** Adaptador de gravação do mock: upsert da reação. */
function commitMockCommentReaction(command: CommentReactionCommand) {
  const existing = getDb().reactions.find(
    (item) => item.commentId === command.commentId && item.userId === command.userId
  )

  if (existing) {
    existing.type = command.type
    existing.updatedAt = nowIso()
    return existing
  }

  const reaction = {
    id: uid(),
    commentId: command.commentId,
    userId: command.userId,
    type: command.type,
    updatedAt: nowIso()
  }
  getDb().reactions.push(reaction)
  return reaction
}

function reactToComment(commentId: string, body: Body): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  // Gate: comentário existe e o capítulo dele está liberado para o membro.
  const comment = getDb().comments.find((item) => item.id === commentId)
  const canReact = Boolean(
    comment && getFinishedChapterForUser(comment.chapterId, current.userId)
  )

  const decision = resolveCommentReaction({
    canReact,
    commentId,
    userId: current.userId,
    rawType: body.type
  })

  if (!decision.ok) return err(decision.status, decision.error)

  const reaction = commitMockCommentReaction(decision.command)
  persist()

  // Homologação: simula o push da reação para o autor do comentário. Reagir ao
  // próprio comentário não notifica ninguém.
  if (comment && comment.userId !== current.userId) {
    const chapter = getDb().chapters.find((item) => item.id === comment.chapterId)
    const actor = getDb().users.find((item) => item.id === current.userId)

    if (chapter) {
      simulateLocalPush(
        commentReactionNotification(
          actor?.displayName || actor?.login || 'Um membro',
          chapterMessageLabel(chapter),
          comment.id,
          activityIdFor('CHAPTER_COMMENTED', comment.userId, comment.chapterId)
        )
      )
    }
  }

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

  const login = normalizeLogin(body.login)
  const decision = resolveCreateUser({
    rawLogin: body.login,
    rawPassword: body.password,
    rawDisplayName: body.displayName,
    loginTaken: Boolean(login) && getDb().users.some((item) => item.login === login)
  })
  if (!decision.ok) return err(decision.status, decision.error)

  const user = {
    id: uid(),
    login: decision.command.login,
    password: decision.command.password,
    role: 'MEMBER' as const,
    displayName: decision.command.displayName,
    avatarUrl: null,
    deactivatedAt: null,
    createdAt: nowIso()
  }
  getDb().users.push(user)

  addActivity(null, decision.command.activity.type, decision.command.activity.message, {
    userId: user.id
  })
  persist()

  return json(201, { user: memberView(user.id) })
}

function updateUser(userId: string, body: Body): MockResponse {
  const guard = requireAdmin()
  if (isResponse(guard)) return guard

  const user = getDb().users.find((item) => item.id === userId)
  const decision = resolveUpdateUser({
    userId,
    userExists: Boolean(user),
    rawDeactivated: body.deactivated,
    rawNewPassword: body.newPassword
  })
  if (!decision.ok) return err(decision.status, decision.error)

  if (decision.command.changes.deactivated !== undefined) {
    user!.deactivatedAt = decision.command.changes.deactivated ? nowIso() : null
  }
  if (decision.command.changes.newPassword !== undefined) {
    user!.password = decision.command.changes.newPassword
  }

  persist()
  return json(200, { user: memberView(userId) })
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
  const decision = resolveCreateChapter({
    currentBookId: clubBook?.id ?? null,
    existingNumbers: clubBook ? chaptersOf(clubBook.id).map((chapter) => chapter.number) : [],
    rawNumber: body.number,
    rawTitle: body.title
  })
  if (!decision.ok) return err(decision.status, decision.error)

  const chapter = {
    id: uid(),
    clubBookId: decision.command.clubBookId,
    number: decision.command.number,
    title: decision.command.title
  }
  getDb().chapters.push(chapter)
  persist()

  return json(201, { chapter })
}

function updateChapter(chapterId: string, body: Body): MockResponse {
  const guard = requireAdmin()
  if (isResponse(guard)) return guard

  const chapter = currentChapter(chapterId)
  const siblingNumbers = chapter
    ? getDb()
        .chapters.filter((item) => item.clubBookId === chapter.clubBookId && item.id !== chapter.id)
        .map((item) => item.number)
    : []

  const decision = resolveUpdateChapter({
    chapter: chapter
      ? { id: chapter.id, clubBookId: chapter.clubBookId, number: chapter.number, title: chapter.title }
      : null,
    siblingNumbers,
    rawNumber: body.number,
    rawTitle: body.title
  })
  if (!decision.ok) return err(decision.status, decision.error)

  if (decision.command.changes.number !== undefined) chapter!.number = decision.command.changes.number
  if (decision.command.changes.title !== undefined) chapter!.title = decision.command.changes.title

  persist()
  return json(200, { chapter })
}

function deleteChapter(chapterId: string): MockResponse {
  const guard = requireAdmin()
  if (isResponse(guard)) return guard

  const chapter = currentChapter(chapterId)
  const hasMemberActivity = chapter
    ? getDb().progress.some((item) => item.chapterId === chapter.id) ||
      getDb().comments.some((item) => item.chapterId === chapter.id)
    : false

  const decision = resolveDeleteChapter({
    chapter: chapter
      ? { id: chapter.id, clubBookId: chapter.clubBookId, number: chapter.number, title: chapter.title }
      : null,
    hasMemberActivity
  })
  if (!decision.ok) return err(decision.status, decision.error)

  getDb().chapters = getDb().chapters.filter((item) => item.id !== decision.chapterId)
  persist()

  return json(200, { ok: true })
}

// ---------------------------------------------------------------------------
// Profile.
// ---------------------------------------------------------------------------

/**
 * Contadores vitalícios do membro logado — espelha o /api/profile/stats real:
 * soma todos os livros, não só o atual (capítulos) nem só os arquivados
 * (comentários).
 */
function profileStats(): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')

  const chaptersRead = getDb().progress.filter(
    (item) => item.userId === current.userId && item.status === 'FINISHED'
  ).length
  const comments = getDb().comments.filter((item) => item.userId === current.userId).length

  return json(200, { chaptersRead, comments })
}

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

// ---------------------------------------------------------------------------
// Push (homologação): sem servidor real; a entrega é simulada localmente no
// evento (ver simulateLocalPush). Os endpoints só confirmam a "assinatura".
// ---------------------------------------------------------------------------

function pushSubscribe(): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')
  return json(201, { ok: true })
}

function pushUnsubscribe(): MockResponse {
  const current = session()
  if (!current || !current.userId) return err(401, 'Unauthorized.')
  return json(200, { ok: true })
}
