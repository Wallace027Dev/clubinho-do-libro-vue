/**
 * Entrega de Web Push no backend real. Configura o VAPID a partir do ambiente,
 * envia o payload (conteúdo vem do domínio) para as assinaturas dos usuários e
 * remove assinaturas expiradas (404/410). Sem VAPID configurado, vira no-op —
 * o app funciona normalmente, só não envia push.
 */
import webpush from 'web-push'
import { prisma } from './prisma.js'
import { chapterMessageLabel } from '../../src/domain/chapterLabel.js'
import {
  activeMemberIds,
  bookFinishedNotification,
  chapterCommentNotification,
  chapterFinishedNotification,
  commentReactionNotification,
  excludeUser,
  type NotificationPayload
} from '../../src/domain/notifications.js'

let configured: boolean | null = null

function ensureConfigured(): boolean {
  if (configured !== null) {
    return configured
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:clube@clubinhodolibro.app'

  if (!publicKey || !privateKey) {
    configured = false
    return false
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

/** Envia o payload para todas as assinaturas dos usuários informados. */
export async function sendPushToUsers(
  userIds: string[],
  payload: NotificationPayload
): Promise<void> {
  if (userIds.length === 0 || !ensureConfigured()) {
    return
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } }
  })

  const body = JSON.stringify(payload)

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          },
          body
        )
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode
        // Assinatura expirada/cancelada no serviço de push: remove.
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription
            .delete({ where: { endpoint: subscription.endpoint } })
            .catch(() => {})
        }
      }
    })
  )
}

/** Nome de exibição do ator para as mensagens de push. */
async function actorName(actorId: string | null): Promise<string> {
  if (!actorId) {
    return 'Um membro'
  }

  const user = await prisma.user.findUnique({
    where: { id: actorId },
    select: { displayName: true, login: true }
  })

  return user?.displayName || user?.login || 'Um membro'
}

async function activeMembers() {
  return prisma.user.findMany({ select: { id: true, deactivatedAt: true } })
}

/**
 * Id da atividade que representa a interação, para a notificação levar à página
 * dela. Resolvido por (tipo, ator, capítulo) — a mais recente —, o que evita
 * fazer os comandos de domínio e os repositórios devolverem o id só por causa do
 * push.
 */
async function activityIdFor(
  type: 'CHAPTER_FINISHED' | 'CHAPTER_COMMENTED',
  actorId: string | null,
  chapterId: string
): Promise<string | null> {
  if (!actorId) {
    return null
  }

  const activity = await prisma.activity.findFirst({
    where: { type, actorId, metadata: { path: ['chapterId'], equals: chapterId } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { id: true }
  })

  return activity?.id ?? null
}

/** Capítulo concluído: notifica os demais membros ativos. */
export async function notifyChapterFinished(
  actorId: string | null,
  chapterId: string
): Promise<void> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { number: true, title: true }
  })

  if (!chapter) {
    return
  }

  await sendPushToUsers(
    activeMemberIds(await activeMembers(), actorId),
    chapterFinishedNotification(
      await actorName(actorId),
      chapterMessageLabel(chapter),
      await activityIdFor('CHAPTER_FINISHED', actorId, chapterId)
    )
  )
}

/** Livro finalizado pelo clube: notifica os demais membros ativos. */
export async function notifyBookFinished(
  actorId: string | null,
  bookTitle: string
): Promise<void> {
  await sendPushToUsers(
    activeMemberIds(await activeMembers(), actorId),
    bookFinishedNotification(bookTitle)
  )
}

/**
 * Novo comentário num capítulo: anti-spoiler — só quem **já concluiu** aquele
 * capítulo recebe, menos o autor do comentário.
 */
export async function notifyChapterComment(
  actorId: string | null,
  chapterId: string
): Promise<void> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { number: true, title: true }
  })

  if (!chapter) {
    return
  }

  const finishers = await prisma.chapterProgress.findMany({
    where: { chapterId, status: 'FINISHED' },
    select: { userId: true }
  })

  await sendPushToUsers(
    excludeUser(
      finishers.map((progress) => progress.userId),
      actorId
    ),
    chapterCommentNotification(
      await actorName(actorId),
      chapterMessageLabel(chapter),
      await activityIdFor('CHAPTER_COMMENTED', actorId, chapterId)
    )
  )
}

/**
 * Reação num comentário: notifica **só o autor do comentário**, e não quando a
 * pessoa reage ao próprio. O autor concluiu o capítulo (é pré-requisito para
 * comentar), então não há questão de spoiler aqui.
 */
export async function notifyCommentReaction(
  actorId: string | null,
  commentId: string
): Promise<void> {
  const comment = await prisma.chapterComment.findUnique({
    where: { id: commentId },
    select: { userId: true, chapterId: true, chapter: { select: { number: true, title: true } } }
  })

  if (!comment || !comment.chapter || comment.userId === actorId) {
    return
  }

  await sendPushToUsers(
    [comment.userId],
    commentReactionNotification(
      await actorName(actorId),
      chapterMessageLabel(comment.chapter),
      commentId,
      await activityIdFor('CHAPTER_COMMENTED', comment.userId, comment.chapterId)
    )
  )
}
