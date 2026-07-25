/**
 * Consultas paginadas das duas trilhas de atividade, específicas do usuário:
 *
 * - **feed** (`commentFeedPage`): comentários de **outras** pessoas, só de
 *   capítulos que o usuário **já concluiu** (anti-spoiler). É o que aparece na
 *   página /feed, cada item com link para a página do comentário.
 * - **alertas** (`alertsPage`): progresso/marcos (canal `alert`) de **outros**
 *   usuários — o log do sininho (modal).
 *
 * A classificação de canal vive no domínio (`src/domain/activities.ts`); aqui
 * ficam só os filtros que dependem do banco (quem concluiu o quê, quem é o
 * autor).
 */
import type { ActivityType, Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { ALERT_ACTIVITY_TYPES } from '../../src/domain/activities.js'

const actorSelect = { id: true, login: true, displayName: true, avatarUrl: true } as const

interface ActivityView {
  id: string
  type: ActivityType
  message: string
  createdAt: Date
  actor: { id: string; login: string; displayName: string | null; avatarUrl: string | null } | null
  metadata: Prisma.JsonValue
}

/** Ids dos capítulos que o usuário já concluiu. */
async function finishedChapterIds(userId: string): Promise<string[]> {
  const rows = await prisma.chapterProgress.findMany({
    where: { userId, status: 'FINISHED' },
    select: { chapterId: true }
  })
  return rows.map((row) => row.chapterId)
}

async function query(
  where: Prisma.ActivityWhereInput,
  cursor: string | null,
  limit: number
): Promise<{ activities: ActivityView[]; hasMore: boolean }> {
  const activities = await prisma.activity.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { actor: { select: actorSelect } }
  })

  return {
    activities: activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      message: activity.message,
      createdAt: activity.createdAt,
      actor: activity.actor,
      metadata: activity.metadata
    })),
    hasMore: activities.length === limit
  }
}

export async function commentFeedPage(
  clubId: string,
  viewerId: string | null,
  cursor: string | null,
  limit: number
) {
  const finished = viewerId ? await finishedChapterIds(viewerId) : []

  if (finished.length === 0) {
    return { activities: [], hasMore: false }
  }

  return query(
    {
      clubId,
      type: 'CHAPTER_COMMENTED',
      ...(viewerId ? { actorId: { not: viewerId } } : {}),
      // Só comentários de capítulos que o usuário concluiu (anti-spoiler).
      OR: finished.map((chapterId) => ({ metadata: { path: ['chapterId'], equals: chapterId } }))
    },
    cursor,
    limit
  )
}

export async function alertsPage(
  clubId: string,
  viewerId: string | null,
  cursor: string | null,
  limit: number
) {
  return query(
    {
      clubId,
      type: { in: [...ALERT_ACTIVITY_TYPES] as ActivityType[] },
      // De outros usuários (mantém eventos do sistema, com ator nulo).
      ...(viewerId ? { OR: [{ actorId: null }, { actorId: { not: viewerId } }] } : {})
    },
    cursor,
    limit
  )
}
