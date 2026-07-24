/**
 * Adaptador Prisma da administração de capítulos (contrato em
 * `src/domain/services/adminChapters.ts`). Só persistência: resolve o livro
 * atual e o capítulo, expõe os números existentes/irmãos para o gate de
 * duplicidade e grava.
 */
import { getDefaultClub } from '../club.js'
import { prisma } from '../prisma.js'
import type {
  AdminChapter,
  AdminChaptersRepository,
  CreateChapterCommand,
  UpdateChapterCommand
} from '../../../src/domain/services/adminChapters.js'

type PrismaChapter = Awaited<ReturnType<typeof prisma.chapter.create>>

async function currentBookId(): Promise<string | null> {
  const club = await getDefaultClub()
  const currentBook = await prisma.clubBook.findFirst({
    where: { clubId: club.id, status: 'CURRENT' },
    select: { id: true }
  })
  return currentBook?.id ?? null
}

async function loadCurrentChapter(chapterId: string): Promise<AdminChapter | null> {
  const club = await getDefaultClub()
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { clubBook: true }
  })

  if (!chapter || chapter.clubBook.clubId !== club.id || chapter.clubBook.status !== 'CURRENT') {
    return null
  }

  return { id: chapter.id, clubBookId: chapter.clubBookId, number: chapter.number, title: chapter.title }
}

export function adminChaptersRepository(): AdminChaptersRepository<PrismaChapter> {
  return {
    getCurrentBookId: currentBookId,

    async getExistingNumbers(clubBookId) {
      const chapters = await prisma.chapter.findMany({
        where: { clubBookId },
        select: { number: true }
      })
      return chapters.map((chapter) => chapter.number)
    },

    async createChapter(command: CreateChapterCommand) {
      return prisma.chapter.create({
        data: { clubBookId: command.clubBookId, number: command.number, title: command.title }
      })
    },

    getCurrentChapter: loadCurrentChapter,

    async getSiblingNumbers(chapter) {
      const siblings = await prisma.chapter.findMany({
        where: { clubBookId: chapter.clubBookId, id: { not: chapter.id } },
        select: { number: true }
      })
      return siblings.map((sibling) => sibling.number)
    },

    async updateChapter(command: UpdateChapterCommand) {
      return prisma.chapter.update({ where: { id: command.chapterId }, data: command.changes })
    },

    async hasMemberActivity(chapterId) {
      const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        include: { _count: { select: { progress: true, comments: true } } }
      })
      return Boolean(chapter && (chapter._count.progress > 0 || chapter._count.comments > 0))
    },

    async deleteChapter(chapterId) {
      await prisma.chapter.delete({ where: { id: chapterId } })
    }
  }
}
