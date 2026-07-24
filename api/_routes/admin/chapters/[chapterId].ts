import { requireAdmin } from '../../../_lib/auth.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { adminChaptersRepository } from '../../../_lib/repositories/adminChaptersRepository.js'
import { deleteChapter, updateChapter } from '../../../../src/domain/services/adminChapters.js'

interface UpdateChapterBody {
  number?: number
  title?: string
}

/**
 * Edição/exclusão de capítulo pelo admin. Regras no domínio
 * (`src/domain/services/adminChapters.ts`):
 * - PATCH: número e título editáveis (número não pode colidir).
 * - DELETE: apenas se nenhum membro tem progresso ou comentário no capítulo.
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['PATCH', 'DELETE'])) {
    return
  }

  const session = await requireAdmin(req, res)

  if (!session) {
    return
  }

  const repo = adminChaptersRepository()
  const chapterId = req.query.chapterId as string

  if (req.method === 'DELETE') {
    const result = await deleteChapter(repo, { chapterId })

    if (!result.ok) {
      sendJson(res, result.status, { error: result.error })
      return
    }

    sendJson(res, 200, { ok: true })
    return
  }

  const body = readBody<UpdateChapterBody>(req)
  const result = await updateChapter(repo, {
    chapterId,
    rawNumber: body.number,
    rawTitle: body.title
  })

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error })
    return
  }

  sendJson(res, 200, { chapter: result.chapter })
}
