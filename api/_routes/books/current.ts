import { requireAdmin, requireSession } from '../../_lib/auth.js'
import { getDefaultClub } from '../../_lib/club.js'
import { assertMethod, readBody, sendJson } from '../../_lib/http.js'
import { prisma } from '../../_lib/prisma.js'
import { getClubBookReviews, userFinishedAllChapters } from '../../_lib/reviews.js'
import { selectBookRepository } from '../../_lib/repositories/adminBookRepository.js'
import { selectBook } from '../../../src/domain/services/adminBook.js'

interface SelectBookBody {
  title?: string
  author?: string
  description?: string
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
    const activities = await prisma.activity.findMany({
      where: { clubId: club.id },
      // Mesma ordem do feed paginado (/api/activities) para o cursor casar.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 30,
      include: {
        actor: {
          select: { id: true, login: true, displayName: true, avatarUrl: true }
        }
      }
    })

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
    rawDescription: body.description
  })

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error })
    return
  }

  sendJson(res, 201, { currentBook: result.currentBook })
}
