import { prisma } from './prisma.js'
import { averageRating } from '../../src/domain/rating.js'
import { everyChapterFinished, everyChapterRated } from '../../src/domain/chapterProgress.js'

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

  const average = averageRating(reviews.map((review) => review.rating))

  return { reviews, reviewSummary: { average, count: reviews.length } }
}

/**
 * Indica se o usuário deu nota a todos os capítulos do ClubBook.
 * Regra da fase 8: avaliar o livro exige todos os capítulos notados.
 */
export async function userRatedAllChapters(clubBookId: string, userId: string) {
  const chapters = await prisma.chapter.findMany({
    where: { clubBookId },
    include: {
      ratings: {
        where: { userId },
        select: { id: true }
      }
    }
  })

  return everyChapterRated(chapters.map((chapter) => chapter.ratings.length > 0))
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

  return everyChapterFinished(chapters.map((chapter) => chapter.progress[0]?.status))
}
