/**
 * Adaptador Prisma do repositório de conclusão de capítulo (contrato em
 * `src/domain/services/chapterFinish.ts`). Cuida só da persistência: o backend
 * real lê o capítulo do livro atual, o autor, e grava progresso + nota +
 * atividade numa transação. A decisão (regras) fica no núcleo do domínio.
 */
import type { Prisma } from '@prisma/client'
import { getDefaultClub } from '../club.js'
import { prisma } from '../prisma.js'
import type {
  ChapterFinishCommand,
  ChapterFinishRepository
} from '../../../src/domain/services/chapterFinish.js'

type PrismaChapterProgress = Awaited<ReturnType<typeof prisma.chapterProgress.upsert>>

export function chapterFinishRepository(): ChapterFinishRepository<PrismaChapterProgress> {
  return {
    async getCurrentChapter(chapterId) {
      const club = await getDefaultClub()
      const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        include: { clubBook: true }
      })

      if (
        !chapter ||
        chapter.clubBook.clubId !== club.id ||
        chapter.clubBook.status !== 'CURRENT'
      ) {
        return null
      }

      return { id: chapter.id, number: chapter.number, title: chapter.title }
    },

    async getActor(userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      return user ? { displayName: user.displayName, login: user.login } : null
    },

    async commitFinish(command: ChapterFinishCommand) {
      const club = await getDefaultClub()

      return prisma.$transaction(async (tx) => {
        const savedProgress = await tx.chapterProgress.upsert({
          where: {
            chapterId_userId: { chapterId: command.chapterId, userId: command.userId }
          },
          update: { status: 'FINISHED', finishedAt: command.finishedAt },
          create: {
            chapterId: command.chapterId,
            userId: command.userId,
            status: 'FINISHED',
            startedAt: command.finishedAt,
            finishedAt: command.finishedAt
          }
        })

        await tx.chapterRating.upsert({
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

        await tx.activity.create({
          data: {
            clubId: club.id,
            actorId: command.userId,
            type: command.activity.type,
            message: command.activity.message,
            metadata: command.activity.metadata as unknown as Prisma.InputJsonObject
          }
        })

        return savedProgress
      })
    }
  }
}
