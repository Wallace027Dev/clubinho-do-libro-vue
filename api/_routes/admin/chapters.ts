import { requireAdmin } from '../../_lib/auth.js'
import { getDefaultClub } from '../../_lib/club.js'
import { assertMethod, readBody, sendJson } from '../../_lib/http.js'
import { prisma } from '../../_lib/prisma.js'

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

  const club = await getDefaultClub()
  const currentBook = await prisma.clubBook.findFirst({
    where: { clubId: club.id, status: 'CURRENT' },
    include: { book: true }
  })

  if (!currentBook) {
    sendJson(res, 404, { error: 'Não existe livro atual em andamento.' })
    return
  }

  if (req.method === 'GET') {
    const chapters = await prisma.chapter.findMany({
      where: { clubBookId: currentBook.id },
      orderBy: { number: 'asc' }
    })

    sendJson(res, 200, { chapters })
    return
  }

  const body = readBody<ChapterBody>(req)
  const number = Number(body.number)
  const title = body.title?.trim()

  if (!Number.isInteger(number) || number < 1 || !title) {
    sendJson(res, 400, { error: 'Informe número e título do capítulo.' })
    return
  }

  const chapter = await prisma.chapter.create({
    data: {
      clubBookId: currentBook.id,
      number,
      title
    }
  })

  sendJson(res, 201, { chapter })
}
