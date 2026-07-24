/*
 * Handlers de Web Push, importados pelo service worker gerado pelo
 * vite-plugin-pwa (workbox.importScripts). Mostra a notificação recebida e
 * abre/foca a rota ao tocar nela.
 */
self.addEventListener('push', (event) => {
  let payload = {}

  try {
    payload = event.data ? event.data.json() : {}
  } catch (error) {
    payload = {}
  }

  const title = payload.title || 'Clubinho do Libro'
  const options = {
    body: payload.body || '',
    tag: payload.tag,
    data: { url: payload.url || '/' },
    icon: '/pwa-icon.svg',
    badge: '/pwa-icon.svg'
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }

      return undefined
    })
  )
})
