/**
 * Adaptador Prisma do repositório de nota de capítulo (contrato em
 * `src/domain/services/chapterRating.ts`). Só persistência: resolve o gate
 * anti-spoiler pela lib de acesso e faz o upsert da nota.
 */
import { getFinishedChapterForUser } from '../chapterAccess.js'
import { prisma } from '../prisma.js'
import type {
  ChapterRatingCommand,
  ChapterRatingRepository
} from '../../../src/domain/services/chapterRating.js'

type PrismaChapterRating = Awaited<ReturnType<typeof prisma.chapterRating.upsert>>

export function chapterRatingRepository(): ChapterRatingRepository<PrismaChapterRating> {
  return {
    async getFinishedChapter(chapterId, userId) {
      const access = await getFinishedChapterForUser(chapterId, userId)
      return access ? { id: access.chapter.id } : null
    },

    async saveRating(command: ChapterRatingCommand) {
      return prisma.chapterRating.upsert({
        where: {
          chapterId_userId: { chapterId: command.chapterId, userId: command.userId }
        },
        update: { rating: command.rating },
        create: {
          chapterId: command.chapterId,
          userId: command.userId,
          rating: command.rating
        }
      })
    }
  }
}
