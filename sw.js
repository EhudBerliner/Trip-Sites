/* ─── PWA Service Worker - MyTrip Krakow ─── */
const APP_VERSION = '1.0.4';
const CACHE_NAME = `mytrip-krakow-v${APP_VERSION}`;

const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  'https://cdn-icons-png.flaticon.com/512/854/854878.png'
];

// התקנת ה-Service Worker ושמירת נכסים ב-Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(`[Service Worker ${APP_VERSION}] Caching app shell`);
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// אקטיבציה וניקוי Caches ישנים (במידה ומספר הגרסה השתנה)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[Service Worker ${APP_VERSION}] Removing old cache:`, key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// אסטרטגיית Cache First מול רשת (עוקף בקשות Apps Script)
self.addEventListener('fetch', (event) => {
  // בקשות ל-Google Apps Script לא נשמרות ב-Cache הסטטי כדי למנוע שיבוש בסנכרון הנתונים
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // שמירת משאבים חדשים ב-Cache (רק עבור בקשות GET שאינן Script)
          if (event.request.method === 'GET' && !event.request.url.includes('script.google.com')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    }).catch(() => {
      // ברירת מחדל לאופליין במקרה של ניווט בדף
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
