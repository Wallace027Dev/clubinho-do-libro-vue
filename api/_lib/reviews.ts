import { prisma } from './prisma'

/**
 * Carrega as avaliacoes de um ClubBook com o resumo (media e total).
 * Usado no livro atual (Fase 6) e no historico do clube (Fase 7).
 */
export async function getClubBookReviews(clubBookId: string) {
  const reviews = await prisma.bookReview.findMany({
    where: { clubBookId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, login: true, displayName: true, avatarUrl: true }
      }
    }
  })

  const count = reviews.length
  const average = count ? reviews.reduce((sum, review) => sum + review.rating, 0) / count : null

  return { reviews, reviewSummary: { average, count } }
}

/**
 * Indica se o usuario concluiu todos os capitulos do ClubBook.
 * Livro sem capitulos ainda nao pode ser avaliado.
 */
export async function userFinishedAllChapters(clubBookId: string, userId: string) {
  const chapters = await prisma.chapter.findMany({
    where: { clubBookId },
    include: {
      progress: {
        where: { userId },
        select: { status: true }
      }
    }
  })

  if (chapters.length === 0) {
    return false
  }

  return chapters.every((chapter) => chapter.progress[0]?.status === 'FINISHED')
}
