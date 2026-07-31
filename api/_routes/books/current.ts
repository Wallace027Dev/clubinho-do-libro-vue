import { requireAdmin, requireSession } from '../../_lib/auth.js'
import { getDefaultClub } from '../../_lib/club.js'
import { assertMethod, readBody, sendJson } from '../../_lib/http.js'
import { prisma } from '../../_lib/prisma.js'
import { getClubBookReviews, userFinishedAllChapters } from '../../_lib/reviews.js'
import { commentFeedPage } from '../../_lib/feedActivities.js'
import { selectBookRepository } from '../../_lib/repositories/adminBookRepository.js'
import { selectBook } from '../../../src/domain/services/adminBook.js'
import { notifyBookSelected } from '../../_lib/push.js'

interface SelectBookBody {
  title?: string
  author?: string
  description?: string
  /** URL de capa vinda da busca externa de livro. */
  coverUrl?: string
  /**
   * Quantos capítulos criar junto com o livro. Não é persistido: só decide
   * quantas linhas de Chapter nascem na mesma transação.
   */
  chapterCount?: number
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['GET', 'POST'])) {
    return
  }

  if (req.method === 'GET') {
    const session = await requireSession(req, res)

    if (!session) {
      return
    }

    const club = await getDefaultClub()
    const currentBook = await prisma.clubBook.findFirst({
      where: { clubId: club.id, status: 'CURRENT' },
      include: {
        book: true,
        chapters: {
          orderBy: { number: 'asc' },
          include: {
            progress: session.userId
              ? {
                  where: { userId: session.userId },
                  select: {
                    status: true,
                    startedAt: true,
                    finishedAt: true
                  }
                }
              : false,
            // Nota que o próprio membro deu ao capítulo (para a UI de
            // avaliação; as médias do clube vivem em books/:id/ratings).
            ratings: session.userId
              ? {
                  where: { userId: session.userId },
                  select: { rating: true }
                }
              : false
          }
        }
      }
    })
    // Primeiro lote do feed = comentários de outros, de capítulos concluídos
    // (mesmo filtro do GET /api/activities).
    const { activities } = await commentFeedPage(club.id, session.userId ?? null, null, 30)

    let currentBookWithReviews = null

    if (currentBook) {
      const { reviews, reviewSummary } = await getClubBookReviews(currentBook.id)

      // Anti-spoiler: a resenha (texto) só aparece para quem terminou o livro.
      // Nota e média continuam visíveis para todos.
      const viewerFinished = session.userId
        ? await userFinishedAllChapters(currentBook.id, session.userId)
        : false

      const safeReviews = viewerFinished
        ? reviews
        : reviews.map((review) => ({ ...review, review: null }))

      currentBookWithReviews = { ...currentBook, reviews: safeReviews, reviewSummary }
    }

    sendJson(res, 200, { currentBook: currentBookWithReviews, activities })
    return
  }

  const session = await requireAdmin(req, res)

  if (!session) {
    return
  }

  const body = readBody<SelectBookBody>(req)
  const result = await selectBook(selectBookRepository(session.userId ?? null), {
    rawTitle: body.title,
    rawAuthor: body.author,
    rawDescription: body.description,
    rawCoverUrl: body.coverUrl,
    rawChapterCount: body.chapterCount
  })

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error })
    return
  }

  // Push best-effort: uma falha de notificação nunca quebra a seleção do livro.
  try {
    await notifyBookSelected(session.userId ?? null, result.currentBook.book.title)
  } catch {
    // Silencioso: sem VAPID/assinaturas, é no-op.
  }

  sendJson(res, 201, { currentBook: result.currentBook })
}
