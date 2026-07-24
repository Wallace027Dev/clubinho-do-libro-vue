import { requireAdmin } from '../../../_lib/auth.js'
import { assertMethod, sendJson } from '../../../_lib/http.js'
import { finishBookRepository } from '../../../_lib/repositories/adminBookRepository.js'
import { notifyBookFinished } from '../../../_lib/push.js'
import { finishBook } from '../../../../src/domain/services/adminBook.js'

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireAdmin(req, res)

  if (!session) {
    return
  }

  const result = await finishBook(finishBookRepository(session.userId ?? null))

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error })
    return
  }

  try {
    await notifyBookFinished(session.userId ?? null, result.finishedBook.book.title)
  } catch {
    // Push best-effort: nunca quebra a finalização do livro.
  }

  sendJson(res, 200, { finishedBook: result.finishedBook })
}
