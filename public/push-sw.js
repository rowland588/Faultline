/* The service worker's half of a reminder that arrives while Faultline is
 * closed (supabase/functions/remind sends it). Pulled into the generated
 * worker by vite.config.ts → workbox.importScripts. */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Faultline', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Faultline';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '', tag: data.tag || 'faultline', icon: '/icon-192.png', badge: '/icon-192.png',
    data: { url: data.url || '/' }, renotify: false,
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  const target = new URL('/#' + url, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.navigate(target); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});
