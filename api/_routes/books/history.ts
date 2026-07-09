import { requireSession } from '../../_lib/auth.js'
import { getDefaultClub } from '../../_lib/club.js'
import { assertMethod, sendJson } from '../../_lib/http.js'
import { prisma } from '../../_lib/prisma.js'
import { getClubBookReviews } from '../../_lib/reviews.js'

/**
 * Historico do clube (Fase 7): livros ja finalizados com a memoria da leitura.
 *
 * Livro finalizado nao tem mais anti-spoiler: notas, resenhas e comentarios
 * por capitulo ficam arquivados e visiveis para os membros.
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['GET'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session) {
    return
  }

  const club = await getDefaultClub()
  const finishedBooks = await prisma.clubBook.findMany({
    where: { clubId: club.id, status: 'FINISHED' },
    orderBy: { finishedAt: 'desc' },
    include: { book: true }
  })

  const books = await Promise.all(
    finishedBooks.map(async (clubBook) => {
      const { reviews, reviewSummary } = await getClubBookReviews(clubBook.id)

      const chapters = await prisma.chapter.findMany({
        where: { clubBookId: clubBook.id },
        orderBy: { number: 'asc' },
        include: {
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { id: true, login: true, displayName: true, avatarUrl: true } },
              reactions: true
            }
          }
        }
      })

      const archivedChapters = chapters.map((chapter) => ({
        id: chapter.id,
        number: chapter.number,
        title: chapter.title,
        comments: chapter.comments.map((comment) => ({
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
          user: comment.user,
          reactions: countReactions(comment.reactions),
          reactionTotal: comment.reactions.length
        }))
      }))

      const commentCount = archivedChapters.reduce((total, chapter) => total + chapter.comments.length, 0)

      return {
        id: clubBook.id,
        selectedAt: clubBook.selectedAt,
        finishedAt: clubBook.finishedAt,
        book: clubBook.book,
        reviews,
        reviewSummary,
        chapters: archivedChapters,
        stats: {
          chapters: chapters.length,
          comments: commentCount,
          reviewers: reviewSummary.count
        }
      }
    })
  )

  sendJson(res, 200, { books })
}

function countReactions(reactions: Array<{ type: string }>) {
  return reactions.reduce<Record<string, number>>((acc, reaction) => {
    acc[reaction.type] = (acc[reaction.type] ?? 0) + 1
    return acc
  }, {})
}
