import { requireAdmin } from '../../../_lib/auth.js'
import { getDefaultClub } from '../../../_lib/club.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { prisma } from '../../../_lib/prisma.js'

interface UpdateChapterBody {
  number?: number
  title?: string
}

/**
 * Edição/exclusão de capítulo pelo admin (fase 8):
 * - PATCH: número e título editáveis a qualquer momento.
 * - DELETE: apenas se nenhum membro tem progresso ou comentário no
 *   capítulo (não apagamos participação dos membros em cascata).
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
    sendJson(res, 404, { error: 'Capítulo atual não encontrado.' })
    return
  }

  if (req.method === 'DELETE') {
    if (chapter._count.progress > 0 || chapter._count.comments > 0) {
      sendJson(res, 409, {
        error: 'Este capítulo já tem progresso ou comentários de membros e não pode ser excluído.'
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
      sendJson(res, 400, { error: 'Número de capítulo inválido.' })
      return
    }

    data.number = number
  }

  if (body.title !== undefined) {
    const title = body.title.trim()

    if (!title) {
      sendJson(res, 400, { error: 'Título do capítulo não pode ficar vazio.' })
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
      sendJson(res, 409, { error: 'Já existe um capítulo com esse número neste livro.' })
      return
    }

    throw error
  }
}
