import { requireAdmin } from '../../../_lib/auth.js'
import { getDefaultClub } from '../../../_lib/club.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { prisma } from '../../../_lib/prisma.js'

interface UpdateChapterBody {
  number?: number
  title?: string
}

/**
 * Edicao/exclusao de capitulo pelo admin (fase 8):
 * - PATCH: numero e titulo editaveis a qualquer momento.
 * - DELETE: apenas se nenhum membro tem progresso ou comentario no
 *   capitulo (nao apagamos participacao dos membros em cascata).
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['PATCH', 'DELETE'])) {
    return
  }

  const session = await requireAdmin(req, res)

  if (!session) {
    return
  }

  const chapterId = req.query.chapterId as string
  const club = await getDefaultClub()
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      clubBook: true,
      _count: { select: { progress: true, comments: true } }
    }
  })

  if (!chapter || chapter.clubBook.clubId !== club.id || chapter.clubBook.status !== 'CURRENT') {
    sendJson(res, 404, { error: 'Capitulo atual nao encontrado.' })
    return
  }

  if (req.method === 'DELETE') {
    if (chapter._count.progress > 0 || chapter._count.comments > 0) {
      sendJson(res, 409, {
        error: 'Este capitulo ja tem progresso ou comentarios de membros e nao pode ser excluido.'
      })
      return
    }

    await prisma.chapter.delete({ where: { id: chapter.id } })
    sendJson(res, 200, { ok: true })
    return
  }

  const body = readBody<UpdateChapterBody>(req)
  const data: { number?: number; title?: string } = {}

  if (body.number !== undefined) {
    const number = Number(body.number)

    if (!Number.isInteger(number) || number < 1) {
      sendJson(res, 400, { error: 'Numero de capitulo invalido.' })
      return
    }

    data.number = number
  }

  if (body.title !== undefined) {
    const title = body.title.trim()

    if (!title) {
      sendJson(res, 400, { error: 'Titulo do capitulo nao pode ficar vazio.' })
      return
    }

    data.title = title
  }

  if (!Object.keys(data).length) {
    sendJson(res, 400, { error: 'Nada para atualizar.' })
    return
  }

  try {
    const updated = await prisma.chapter.update({ where: { id: chapter.id }, data })
    sendJson(res, 200, { chapter: updated })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      sendJson(res, 409, { error: 'Ja existe um capitulo com esse numero neste livro.' })
      return
    }

    throw error
  }
}
