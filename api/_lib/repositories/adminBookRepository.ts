/**
 * Adaptadores Prisma do ciclo do livro atual (contratos em
 * `src/domain/services/adminBook.ts`). Só persistência: cria o livro/ClubBook e
 * a atividade ao selecionar, e finaliza o ClubBook atual.
 */
import type { Prisma } from '@prisma/client'
import { getDefaultClub } from '../club.js'
import { prisma } from '../prisma.js'
import type {
  FinishBookCommand,
  FinishBookRepository,
  SelectBookCommand,
  SelectBookRepository
} from '../../../src/domain/services/adminBook.js'

type PrismaClubBookWithBook = Prisma.ClubBookGetPayload<{ include: { book: true } }>

export function selectBookRepository(selectedByUserId: string | null): SelectBookRepository<PrismaClubBookWithBook> {
  return {
    async hasCurrentBook() {
      const club = await getDefaultClub()
      const existing = await prisma.clubBook.findFirst({
        where: { clubId: club.id, status: 'CURRENT' },
        select: { id: true }
      })
      return Boolean(existing)
    },

    async selectBook(command: SelectBookCommand) {
      const club = await getDefaultClub()

      return prisma.$transaction(async (tx) => {
        const book = await tx.book.create({
          data: { title: command.title, author: command.author, description: command.description }
        })

        const selected = await tx.clubBook.create({
          data: { clubId: club.id, bookId: book.id, selectedByUserId },
          include: { book: true }
        })

        await tx.activity.create({
          data: {
            clubId: club.id,
            actorId: selectedByUserId,
            type: command.activity.type,
            message: command.activity.message,
            metadata: { bookId: book.id }
          }
        })

        return selected
      })
    }
  }
}

export function finishBookRepository(finishedByUserId: string | null): FinishBookRepository<PrismaClubBookWithBook> {
  return {
    async getCurrentBook() {
      const club = await getDefaultClub()
      const currentBook = await prisma.clubBook.findFirst({
        where: { clubId: club.id, status: 'CURRENT' },
        include: { book: true }
      })

      return currentBook
        ? { clubBookId: currentBook.id, bookId: currentBook.bookId, title: currentBook.book.title }
        : null
    },

    async finishBook(command: FinishBookCommand) {
      const club = await getDefaultClub()

      return prisma.$transaction(async (tx) => {
        const updated = await tx.clubBook.update({
          where: { id: command.clubBookId },
          data: { status: 'FINISHED', finishedAt: new Date(), finishedByUserId },
          include: { book: true }
        })

        await tx.activity.create({
          data: {
            clubId: club.id,
            actorId: finishedByUserId,
            type: command.activity.type,
            message: command.activity.message,
            metadata: command.activity.metadata
          }
        })

        return updated
      })
    }
  }
}
