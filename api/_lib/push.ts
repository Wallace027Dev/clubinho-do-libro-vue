/**
 * Entrega de Web Push no backend real. Configura o VAPID a partir do ambiente,
 * envia o payload (conteúdo vem do domínio) para as assinaturas dos usuários e
 * remove assinaturas expiradas (404/410). Sem VAPID configurado, vira no-op —
 * o app funciona normalmente, só não envia push.
 */
import webpush from 'web-push'
import { prisma } from './prisma.js'
import {
  activeMemberIds,
  bookSelectedNotification,
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

/** Novo livro do mês: notifica os membros ativos (menos quem selecionou). */
export async function notifyBookSelected(
  actorId: string | null,
  bookTitle: string
): Promise<void> {
  const members = await prisma.user.findMany({ select: { id: true, deactivatedAt: true } })
  await sendPushToUsers(activeMemberIds(members, actorId), bookSelectedNotification(bookTitle))
}
