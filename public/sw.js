// Service Worker para Notificaciones Push - Pizzería Volcán POS
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Escuchar evento push desde el servidor o simulación
self.addEventListener('push', (event) => {
  let data = {
    title: 'Pizzería Volcán',
    body: 'Nueva notificación del sistema POS',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'pos-notification',
  }

  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'pos-notification',
    vibrate: [200, 100, 200, 100, 200],
    data: data.data || {},
    requireInteraction: true,
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Al hacer clic en la notificación push
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    })
  )
})
