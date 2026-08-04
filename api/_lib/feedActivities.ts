/**
 * Consultas paginadas das duas trilhas de atividade, específicas do usuário:
 *
 * - **feed** (`commentFeedPage`): comentários de **outras** pessoas nos
 *   capítulos do **livro atual**. Aparecem todos, mas com anti-spoiler: quem já
 *   concluiu o capítulo vê um trecho do texto (`bodyPreview`) e pode abrir; quem
 *   não concluiu recebe o card **travado** (`locked`, sem `bodyPreview`). É o
 *   que aparece na página /feed.
 * - **alertas** (`alertsPage`): progresso/marcos (canal `alert`) de **outros**
 *   usuários — o log do sininho (modal).
 *
 * A classificação de canal vive no domínio (`src/domain/activities.ts`) e a
 * decisão travado/destravado em `src/domain/feedComment.ts`; aqui ficam só os
 * filtros e junções que dependem do banco (quem concluiu o quê, quem é o autor,
 * os capítulos do livro atual).
 */
import type { ActivityType, Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { ALERT_ACTIVITY_TYPES } from '../../src/domain/activities.js'
import { countReactionTypes, type ReactionType } from '../../src/domain/reactions.js'
import { feedCommentView } from '../../src/domain/feedComment.js'

const actorSelect = { id: true, login: true, displayName: true, avatarUrl: true } as const

interface ActivityView {
  id: string
  type: ActivityType
  message: string
  createdAt: Date
  actor: { id: string; login: string; displayName: string | null; avatarUrl: string | null } | null
  metadata: Prisma.JsonValue
  /** Capítulo do comentário (só em atividade de comentário), para o card/filtro. */
  chapterId?: string | null
  /** Anti-spoiler: `true` quando o espectador não concluiu o capítulo. */
  locked?: boolean
  /** Trecho do comentário; só vem destravado (`null`/ausente quando `locked`). */
  bodyPreview?: string | null
  /** Só em atividade de comentário: reações do comentário, para o card do feed. */
  commentReactions?: Partial<Record<ReactionType, number>>
  commentReactionTotal?: number
}

/** Opções de filtro do feed: busca por texto do card e/ou capítulo específico. */
export interface CommentFeedOptions {
  /** Busca sobre a mensagem do card (autor + capítulo). Vazio = sem busca. */
  q?: string | null
  /** Restringe a um capítulo do livro atual. */
  chapterId?: string | null
}

function chapterIdOf(metadata: Prisma.JsonValue): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null
  }

  const value = (metadata as Record<string, unknown>).chapterId
  return typeof value === 'string' && value ? value : null
}

/** Ids dos capítulos do livro atual do clube (escopo do feed). Bounded por livro. */
async function currentBookChapterIds(clubId: string): Promise<string[]> {
  const clubBook = await prisma.clubBook.findFirst({
    where: { clubId, status: 'CURRENT' },
    select: { chapters: { select: { id: true } } }
  })
  return clubBook?.chapters.map((chapter) => chapter.id) ?? []
}

/** Ids dos capítulos que o usuário já concluiu. */
async function finishedChapterIds(userId: string): Promise<string[]> {
  const rows = await prisma.chapterProgress.findMany({
    where: { userId, status: 'FINISHED' },
    select: { chapterId: true }
  })
  return rows.map((row) => row.chapterId)
}

/**
 * Anexa a cada atividade de comentário: o `chapterId`, a decisão anti-spoiler
 * (`locked` + `bodyPreview`) e as reações do comentário.
 *
 * A metadata não guarda o id do comentário, então a junção com `ChapterComment`
 * é por (capítulo, autor) — que identifica um comentário só, graças ao
 * `@@unique([chapterId, userId])`. Uma consulta em lote para a página inteira.
 * O corpo do comentário só é revelado (como `bodyPreview`) quando destravado —
 * `feedCommentView` garante `null` no travado, então o texto nem sai daqui.
 */
async function withCommentDetails(
  activities: ActivityView[],
  finished: ReadonlySet<string>
): Promise<ActivityView[]> {
  const keys = activities
    .map((activity) => ({
      chapterId: chapterIdOf(activity.metadata),
      userId: activity.actor?.id ?? null
    }))
    .filter((key): key is { chapterId: string; userId: string } =>
      Boolean(key.chapterId && key.userId)
    )

  const comments = keys.length
    ? await prisma.chapterComment.findMany({
        where: { OR: keys },
        select: { chapterId: true, userId: true, body: true, reactions: { select: { type: true } } }
      })
    : []

  const byKey = new Map(comments.map((comment) => [`${comment.chapterId}:${comment.userId}`, comment]))

  return activities.map((activity) => {
    const chapterId = chapterIdOf(activity.metadata)
    const comment = byKey.get(`${chapterId}:${activity.actor?.id}`)
    const { locked, bodyPreview } = feedCommentView({
      finishedChapterIds: finished,
      chapterId,
      body: comment?.body
    })

    const reactions = comment?.reactions ?? []

    return {
      ...activity,
      chapterId,
      locked,
      bodyPreview,
      ...(reactions.length
        ? {
            commentReactions: countReactionTypes(reactions),
            commentReactionTotal: reactions.length
          }
        : {})
    }
  })
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
  limit: number,
  options: CommentFeedOptions = {}
) {
  const bookChapters = await currentBookChapterIds(clubId)

  if (bookChapters.length === 0) {
    return { activities: [], hasMore: false }
  }

  // Filtro por capítulo: só vale se o capítulo é do livro atual.
  const scoped =
    options.chapterId && bookChapters.includes(options.chapterId)
      ? [options.chapterId]
      : options.chapterId
        ? []
        : bookChapters

  if (scoped.length === 0) {
    return { activities: [], hasMore: false }
  }

  const search = options.q?.trim()
  const finished = new Set(viewerId ? await finishedChapterIds(viewerId) : [])

  const page = await query(
    {
      clubId,
      type: 'CHAPTER_COMMENTED',
      ...(viewerId ? { actorId: { not: viewerId } } : {}),
      // Só comentários dos capítulos do livro atual (travados ou não).
      OR: scoped.map((chapterId) => ({ metadata: { path: ['chapterId'], equals: chapterId } })),
      // Busca no servidor sobre a mensagem do card (autor + capítulo). O corpo
      // do comentário fica de fora de propósito: buscar por ele vazaria o texto
      // de capítulos travados.
      ...(search ? { message: { contains: search, mode: 'insensitive' as const } } : {})
    },
    cursor,
    limit
  )

  return { ...page, activities: await withCommentDetails(page.activities, finished) }
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
