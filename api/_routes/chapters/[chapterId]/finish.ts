import { requireSession } from '../../../_lib/auth.js'
import { getDefaultClub } from '../../../_lib/club.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { chapterMessageLabel } from '../../../_lib/chapterLabel.js'
import { prisma } from '../../../_lib/prisma.js'

interface FinishBody {
  finishedAt?: string
}

/**
 * Resolve o horário de conclusão informado pelo membro. Aceita apenas datas
 * válidas e não futuras; caso contrário, usa o horário atual como padrão.
 */
function resolveFinishedAt(raw: string | undefined, now: Date): Date {
  if (!raw) {
    return now
  }

  const parsed = new Date(raw)

  if (Number.isNaN(parsed.getTime()) || parsed.getTime() > now.getTime()) {
    return now
  }

  return parsed
}

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
    include: {
      clubBook: {
        include: { book: true }
      }
    }
  })

  if (!chapter || chapter.clubBook.clubId !== club.id || chapter.clubBook.status !== 'CURRENT') {
    sendJson(res, 404, { error: 'Capítulo atual não encontrado.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  const now = new Date()
  const body = (req.body ? readBody<FinishBody>(req) : {}) ?? {}
  const finishedAt = resolveFinishedAt(body.finishedAt, now)
  const progress = await prisma.chapterProgress.upsert({
    where: {
      chapterId_userId: {
        chapterId: chapter.id,
        userId: session.userId
      }
    },
    update: {
      status: 'FINISHED',
      finishedAt
    },
    create: {
      chapterId: chapter.id,
      userId: session.userId,
      status: 'FINISHED',
      startedAt: finishedAt,
      finishedAt
    }
  })

  await prisma.activity.create({
    data: {
      clubId: club.id,
      actorId: session.userId,
      type: 'CHAPTER_FINISHED',
      message: `${user?.displayName || user?.login || 'Um membro'} terminou ${chapterMessageLabel(chapter)}.`,
      metadata: { chapterId: chapter.id, chapterNumber: chapter.number, chapterTitle: chapter.title }
    }
  })

  sendJson(res, 200, { progress })
}
