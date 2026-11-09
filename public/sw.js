// Service Worker para o Sintonia PWA e Notificações Push
const CACHE_NAME = 'sintonia-cache-v5';

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

// Mensagem direta do app para exibir notificação de forma 100% nativa
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options = {} } = event.data;
    const origin = self.location.origin;
    const finalOptions = {
      body: options.body || 'Novidade do seu amor no Sintonia 💜',
      icon: options.icon ? (options.icon.startsWith('http') ? options.icon : `${origin}${options.icon}`) : `${origin}/icon-192.png`,
      badge: options.badge ? (options.badge.startsWith('http') ? options.badge : `${origin}${options.badge}`) : `${origin}/icon-192.png`,
      tag: options.tag || 'sintonia-' + Date.now(),
      vibrate: options.vibrate || [300, 100, 300, 100, 300],
      renotify: true,
      data: options.data || { url: '/' },
      ...options,
    };
    if (self.registration && typeof self.registration.showNotification === 'function') {
      self.registration.showNotification(title, finalOptions);
    }
  }
});

// Recebimento de Push Event
self.addEventListener('push', (event) => {
  const origin = self.location.origin;
  let title = 'Sintonia 💜';
  let options = {
    body: 'Você tem uma novidade do seu amor!',
    icon: `${origin}/icon-192.png`,
    badge: `${origin}/icon-192.png`,
    vibrate: [300, 100, 300, 100, 300],
    renotify: true,
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options = {
        ...options,
        body: data.body || options.body,
        icon: data.icon ? (data.icon.startsWith('http') ? data.icon : `${origin}${data.icon}`) : options.icon,
        badge: data.badge ? (data.badge.startsWith('http') ? data.badge : `${origin}${data.badge}`) : options.badge,
        data: data.data || { url: '/' },
      };
    } catch (err) {
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});
