import { requireAdmin } from '../../_lib/auth.js'
import { getDefaultClub } from '../../_lib/club.js'
import { assertMethod, readBody, sendJson } from '../../_lib/http.js'
import { prisma } from '../../_lib/prisma.js'
import { adminChaptersRepository } from '../../_lib/repositories/adminChaptersRepository.js'
import { createChapter } from '../../../src/domain/services/adminChapters.js'

interface ChapterBody {
  number?: number
  title?: string
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['GET', 'POST'])) {
    return
  }

  const session = await requireAdmin(req, res)

  if (!session) {
    return
  }

  if (req.method === 'GET') {
    const club = await getDefaultClub()
    const currentBook = await prisma.clubBook.findFirst({
      where: { clubId: club.id, status: 'CURRENT' },
      select: { id: true }
    })

    if (!currentBook) {
      sendJson(res, 404, { error: 'Não existe livro atual em andamento.' })
      return
    }

    const chapters = await prisma.chapter.findMany({
      where: { clubBookId: currentBook.id },
      orderBy: { number: 'asc' }
    })

    sendJson(res, 200, { chapters })
    return
  }

  const body = readBody<ChapterBody>(req)
  const result = await createChapter(adminChaptersRepository(), {
    rawNumber: body.number,
    rawTitle: body.title
  })

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error })
    return
  }

  sendJson(res, 201, { chapter: result.chapter })
}
