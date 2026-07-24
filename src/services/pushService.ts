/**
 * Serviço de Web Push no frontend: checa suporte, pede permissão, assina no
 * `PushManager` e registra a assinatura no backend. Na homologação (mock) não
 * há servidor de push — a permissão basta, e a entrega é simulada localmente
 * quando o evento acontece (ver mockApi/pushSim).
 *
 * As views usam este serviço; nunca chamam `apiRequest` direto.
 */
import { apiRequest } from './apiClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export type PushStatus = 'unsupported' | 'default' | 'granted' | 'denied'

/** O navegador suporta Web Push? (no mock, basta a Notifications API.) */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  if (__USE_MOCK_API__) {
    return true
  }

  return 'serviceWorker' in navigator && 'PushManager' in window
}

/** Estado atual da permissão de notificação. */
export function pushStatus(): PushStatus {
  if (!isPushSupported()) {
    return 'unsupported'
  }

  return Notification.permission as PushStatus
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))

  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }

  return output
}

/** Pede permissão e assina o push. Devolve o estado final da permissão. */
export async function enablePush(): Promise<PushStatus> {
  if (!isPushSupported()) {
    return 'unsupported'
  }

  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {
    return permission as PushStatus
  }

  // Homologação: sem servidor de push; a permissão habilita a simulação local.
  if (__USE_MOCK_API__) {
    await apiRequest('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ mock: true })
    }).catch(() => {})
    return 'granted'
  }

  if (!VAPID_PUBLIC_KEY) {
    return 'unsupported'
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  })

  const json = subscription.toJSON()
  await apiRequest('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys })
  })

  return 'granted'
}

/** Cancela a assinatura no navegador e no backend. */
export async function disablePush(): Promise<void> {
  if (!isPushSupported() || __USE_MOCK_API__) {
    return
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    return
  }

  await apiRequest('/api/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint: subscription.endpoint })
  }).catch(() => {})

  await subscription.unsubscribe().catch(() => {})
}
