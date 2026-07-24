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
  bookSelectedNotification,
  chapterCommentNotification,
  chapterFinishedNotification,
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

/** Novo livro do mês: notifica os membros ativos (menos quem selecionou). */
export async function notifyBookSelected(
  actorId: string | null,
  bookTitle: string
): Promise<void> {
  await sendPushToUsers(
    activeMemberIds(await activeMembers(), actorId),
    bookSelectedNotification(bookTitle)
  )
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
    chapterFinishedNotification(await actorName(actorId), chapterMessageLabel(chapter))
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
    chapterCommentNotification(await actorName(actorId), chapterMessageLabel(chapter))
  )
}
