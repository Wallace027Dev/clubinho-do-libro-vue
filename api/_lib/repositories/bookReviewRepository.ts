/**
 * Adaptador Prisma do repositório de avaliação do livro (contrato em
 * `src/domain/services/bookReview.ts`). Só persistência: resolve o livro atual,
 * o autor e os dois gates de capítulos, e grava a avaliação + atividade numa
 * transação. As regras (ordem dos gates, mensagem) ficam no núcleo do domínio.
 */
import type { Prisma } from '@prisma/client'
import { getDefaultClub } from '../club.js'
import { prisma } from '../prisma.js'
import { userFinishedAllChapters, userRatedAllChapters } from '../reviews.js'
import type {
  BookReviewCommand,
  BookReviewRepository
} from '../../../src/domain/services/bookReview.js'

type PrismaBookReview = Awaited<ReturnType<typeof prisma.bookReview.upsert>>

export function bookReviewRepository(): BookReviewRepository<PrismaBookReview> {
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

    async getActor(userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      return user ? { displayName: user.displayName, login: user.login } : null
    },

    userFinishedAllChapters,
    userRatedAllChapters,

    async commitReview(command: BookReviewCommand) {
      const club = await getDefaultClub()

      return prisma.$transaction(async (tx) => {
        const bookReview = await tx.bookReview.upsert({
          where: {
            clubBookId_userId: { clubBookId: command.clubBookId, userId: command.userId }
          },
          update: { rating: command.rating, review: command.review },
          create: {
            clubBookId: command.clubBookId,
            userId: command.userId,
            rating: command.rating,
            review: command.review
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

        return bookReview
      })
    }
  }
}
