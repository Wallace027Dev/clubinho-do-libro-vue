/**
 * Simulação de Web Push na homologação (mock). Não há servidor de push, então
 * mostramos uma Notification local no próprio navegador para demonstrar o
 * fluxo. No-op fora do navegador (ex.: testes em Node) ou sem permissão.
 */
import type { NotificationPayload } from '../../domain/notifications'

export function simulateLocalPush(payload: NotificationPayload): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return
  }

  navigator.serviceWorker.ready
    .then((registration) =>
      registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        data: { url: payload.url },
        icon: '/pwa-icon.svg',
        badge: '/pwa-icon.svg'
      })
    )
    .catch(() => {})
}
