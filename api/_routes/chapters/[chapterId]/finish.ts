import { requireSession } from '../../../_lib/auth.js'
import { getDefaultClub } from '../../../_lib/club.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { chapterMessageLabel } from '../../../_lib/chapterLabel.js'
import { prisma } from '../../../_lib/prisma.js'
import { formatRating, normalizeRating } from '../../../../src/domain/rating.js'
import { resolveFinishedAt } from '../../../../src/domain/chapterProgress.js'

interface FinishBody {
  finishedAt?: string
  rating?: number
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

  // A nota do capítulo passou a ser obrigatória na conclusão (fica registrada
  // na própria atividade de fim de capítulo).
  const rating = normalizeRating(body.rating)

  if (rating === null) {
    sendJson(res, 400, { error: 'Dê uma nota de 1 a 5 ao concluir o capítulo.' })
    return
  }

  const { progress } = await prisma.$transaction(async (tx) => {
    const savedProgress = await tx.chapterProgress.upsert({
      where: {
        chapterId_userId: {
          chapterId: chapter.id,
          userId: session.userId as string
        }
      },
      update: {
        status: 'FINISHED',
        finishedAt
      },
      create: {
        chapterId: chapter.id,
        userId: session.userId as string,
        status: 'FINISHED',
        startedAt: finishedAt,
        finishedAt
      }
    })

    await tx.chapterRating.upsert({
      where: {
        chapterId_userId: {
          chapterId: chapter.id,
          userId: session.userId as string
        }
      },
      update: { rating },
      create: {
        chapterId: chapter.id,
        userId: session.userId as string,
        rating
      }
    })

    await tx.activity.create({
      data: {
        clubId: club.id,
        actorId: session.userId,
        type: 'CHAPTER_FINISHED',
        message: `${user?.displayName || user?.login || 'Um membro'} terminou ${chapterMessageLabel(chapter)} e deu nota ${formatRating(rating)}.`,
        metadata: {
          chapterId: chapter.id,
          chapterNumber: chapter.number,
          chapterTitle: chapter.title,
          rating
        }
      }
    })

    return { progress: savedProgress }
  })

  sendJson(res, 200, { progress })
}
