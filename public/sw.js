self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Focus the window if it's open, else open a new one
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then( windowClients => {
      // If there is already a window/tab open, focus it
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open one
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
