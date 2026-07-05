import { requireAdmin, requireSession } from '../_lib/auth'
import { getDefaultClub } from '../_lib/club'
import { assertMethod, readBody, sendJson } from '../_lib/http'
import { prisma } from '../_lib/prisma'
import { getClubBookReviews, userFinishedAllChapters } from '../_lib/reviews'

interface SelectBookBody {
  title?: string
  author?: string
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
              : false
          }
        }
      }
    })
    const activities = await prisma.activity.findMany({
      where: { clubId: club.id },
      orderBy: { createdAt: 'desc' },
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

      // Anti-spoiler: a resenha (texto) so aparece para quem terminou o livro.
      // Nota e media continuam visiveis para todos.
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
  const title = body.title?.trim()

  if (!title) {
    sendJson(res, 400, { error: 'Titulo do livro e obrigatorio.' })
    return
  }

  const club = await getDefaultClub()
  const existingCurrent = await prisma.clubBook.findFirst({
    where: { clubId: club.id, status: 'CURRENT' }
  })

  if (existingCurrent) {
    sendJson(res, 409, { error: 'Ja existe um livro atual em andamento.' })
    return
  }

  const clubBook = await prisma.$transaction(async (tx) => {
    const book = await tx.book.create({
      data: {
        title,
        author: body.author?.trim() || null
      }
    })

    const selected = await tx.clubBook.create({
      data: {
        clubId: club.id,
        bookId: book.id,
        selectedByUserId: session.userId
      },
      include: { book: true }
    })

    await tx.activity.create({
      data: {
        clubId: club.id,
        actorId: session.userId,
        type: 'BOOK_SELECTED',
        message: `${book.title} virou o livro atual do clube.`,
        metadata: { bookId: book.id }
      }
    })

    return selected
  })

  sendJson(res, 201, { currentBook: clubBook })
}
