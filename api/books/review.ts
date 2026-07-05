import { requireSession } from '../_lib/auth'
import { getDefaultClub } from '../_lib/club'
import { assertMethod, readBody, sendJson } from '../_lib/http'
import { prisma } from '../_lib/prisma'
import { userFinishedAllChapters } from '../_lib/reviews'

interface ReviewBody {
  rating?: number
  review?: string
}

const MAX_REVIEW_LENGTH = 1000

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const club = await getDefaultClub()
  const currentBook = await prisma.clubBook.findFirst({
    where: { clubId: club.id, status: 'CURRENT' },
    include: { book: true }
  })

  if (!currentBook) {
    sendJson(res, 404, { error: 'Nao existe livro atual em andamento.' })
    return
  }

  const body = readBody<ReviewBody>(req)
  const rating = Number(body.rating)

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    sendJson(res, 400, { error: 'A nota deve ser um numero de 1 a 5.' })
    return
  }

  const review = body.review?.trim() || null

  if (review && review.length > MAX_REVIEW_LENGTH) {
    sendJson(res, 400, { error: `A resenha deve ter ate ${MAX_REVIEW_LENGTH} caracteres.` })
    return
  }

  const finishedAll = await userFinishedAllChapters(currentBook.id, session.userId)

  if (!finishedAll) {
    sendJson(res, 403, { error: 'Conclua todos os capitulos para avaliar o livro.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })

  const saved = await prisma.$transaction(async (tx) => {
    const bookReview = await tx.bookReview.upsert({
      where: {
        clubBookId_userId: {
          clubBookId: currentBook.id,
          userId: session.userId as string
        }
      },
      update: { rating, review },
      create: {
        clubBookId: currentBook.id,
        userId: session.userId as string,
        rating,
        review
      }
    })

    await tx.activity.create({
      data: {
        clubId: club.id,
        actorId: session.userId,
        type: 'BOOK_REVIEWED',
        message: `${user?.displayName || user?.login || 'Um membro'} avaliou ${currentBook.book.title} com ${rating}/5.`,
        metadata: { bookId: currentBook.bookId, rating }
      }
    })

    return bookReview
  })

  sendJson(res, 200, { review: saved })
}
