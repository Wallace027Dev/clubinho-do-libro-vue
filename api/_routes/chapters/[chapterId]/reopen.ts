import { requireSession } from '../../../_lib/auth.js'
import { getDefaultClub } from '../../../_lib/club.js'
import { assertMethod, sendJson } from '../../../_lib/http.js'
import { prisma } from '../../../_lib/prisma.js'

/**
 * Desfaz a conclusão de um capítulo (FINISHED -> STARTED).
 *
 * Regras alinhadas na fase 8: o comentário do usuário continua existindo,
 * as atividades anteriores do feed são preservadas e nenhuma atividade
 * nova é criada (o desfazer é discreto). O capítulo volta a ficar
 * bloqueado pelo anti-spoiler para o próprio usuário.
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const chapterId = req.query.chapterId as string
  const club = await getDefaultClub()
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { clubBook: true }
  })

  if (!chapter || chapter.clubBook.clubId !== club.id || chapter.clubBook.status !== 'CURRENT') {
    sendJson(res, 404, { error: 'Capítulo atual não encontrado.' })
    return
  }

  const existing = await prisma.chapterProgress.findUnique({
    where: {
      chapterId_userId: {
        chapterId: chapter.id,
        userId: session.userId
      }
    }
  })

  if (!existing || existing.status !== 'FINISHED') {
    sendJson(res, 409, { error: 'Só é possível desfazer a conclusão de um capítulo concluído.' })
    return
  }

  const progress = await prisma.chapterProgress.update({
    where: { id: existing.id },
    data: {
      status: 'STARTED',
      finishedAt: null
    }
  })

  sendJson(res, 200, { progress })
}
