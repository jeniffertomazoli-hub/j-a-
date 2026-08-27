// Service Worker para o Sintonia PWA e Notificações Push
const CACHE_NAME = 'sintonia-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Clique na notificação abre ou foca no app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Recebimento de Push Event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Sintonia 💜';
    const options = {
      body: data.body || 'Você tem uma novidade do seu amor!',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      data: data.data || { url: '/' },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Erro ao processar push:', err);
  }
});
