import { requireSession } from '../../../_lib/auth.js'
import { getDefaultClub } from '../../../_lib/club.js'
import { assertMethod, sendJson } from '../../../_lib/http.js'
import { prisma } from '../../../_lib/prisma.js'
import { getClubBookReviews } from '../../../_lib/reviews.js'

/**
 * Heatmap de avaliação por capítulo de um livro do clube (atual ou
 * finalizado).
 *
 * Visibilidade: em livro CURRENT, a média de um capítulo só aparece para
 * quem concluiu aquele capítulo (anti-spoiler estendido, decidido na
 * fase 8); em livro FINISHED, todas as médias são públicas.
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['GET'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session) {
    return
  }

  const clubBookId = req.query.clubBookId as string
  const club = await getDefaultClub()
  const clubBook = await prisma.clubBook.findUnique({
    where: { id: clubBookId },
    include: { book: true }
  })

  if (!clubBook || clubBook.clubId !== club.id) {
    sendJson(res, 404, { error: 'Livro não encontrado no clube.' })
    return
  }

  const chapters = await prisma.chapter.findMany({
    where: { clubBookId: clubBook.id },
    orderBy: { number: 'asc' },
    include: {
      ratings: { select: { rating: true, userId: true } },
      progress: session.userId
        ? { where: { userId: session.userId }, select: { status: true } }
        : false
    }
  })

  const isFinishedBook = clubBook.status === 'FINISHED'

  const chapterSummaries = chapters.map((chapter) => {
    const viewerFinished = chapter.progress?.[0]?.status === 'FINISHED'
    const visible = isFinishedBook || viewerFinished
    const count = chapter.ratings.length
    const average = count
      ? Math.round((chapter.ratings.reduce((sum, item) => sum + item.rating, 0) / count) * 10) / 10
      : null
    const myRating = chapter.ratings.find((item) => item.userId === session.userId)?.rating ?? null

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

  const { reviewSummary } = await getClubBookReviews(clubBook.id)

  sendJson(res, 200, {
    book: {
      id: clubBook.id,
      status: clubBook.status,
      finishedAt: clubBook.finishedAt,
      title: clubBook.book.title,
      author: clubBook.book.author,
      coverUrl: clubBook.book.coverUrl
    },
    reviewSummary,
    chapters: chapterSummaries
  })
}
