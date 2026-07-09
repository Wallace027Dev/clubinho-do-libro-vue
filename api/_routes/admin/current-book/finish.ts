import { requireAdmin } from '../../../_lib/auth.js'
import { getDefaultClub } from '../../../_lib/club.js'
import { assertMethod, sendJson } from '../../../_lib/http.js'
import { prisma } from '../../../_lib/prisma.js'

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireAdmin(req, res)

  if (!session) {
    return
  }

  const club = await getDefaultClub()
  const currentBook = await prisma.clubBook.findFirst({
    where: { clubId: club.id, status: 'CURRENT' },
    include: { book: true }
  })

  if (!currentBook) {
    sendJson(res, 404, { error: 'Nao existe livro atual em andamento.' })
    return
  }

  const finishedBook = await prisma.$transaction(async (tx) => {
    const updated = await tx.clubBook.update({
      where: { id: currentBook.id },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
        finishedByUserId: session.userId
      },
      include: { book: true }
    })

    await tx.activity.create({
      data: {
        clubId: club.id,
        actorId: session.userId,
        type: 'BOOK_FINISHED',
        message: `${currentBook.book.title} foi finalizado pelo clube.`,
        metadata: { bookId: currentBook.bookId }
      }
    })

    return updated
  })

  sendJson(res, 200, { finishedBook })
}
