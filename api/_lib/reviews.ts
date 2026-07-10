import { prisma } from './prisma.js'

/**
 * Carrega as avaliações de um ClubBook com o resumo (média e total).
 * Usado no livro atual (Fase 6) e no histórico do clube (Fase 7).
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
 * Indica se o usuário concluiu todos os capítulos do ClubBook.
 * Livro sem capítulos ainda não pode ser avaliado.
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
