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
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      })

      for (const client of clientList) {
        if (!('focus' in client)) {
          continue
        }

        // Antes só focava a janela quando a URL dela já continha o alvo — com o
        // app aberto em outra página, o clique não levava a lugar nenhum. Agora
        // navega a janela existente até a interação.
        const jaEstaNoAlvo = new URL(client.url).pathname === targetUrl

        if (!jaEstaNoAlvo && 'navigate' in client) {
          const navegada = await client.navigate(targetUrl).catch(() => null)
          return (navegada || client).focus()
        }

        return client.focus()
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }

      return undefined
    })()
  )
})
