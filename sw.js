const CACHE_NAME = 'places-app-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn-icons-png.flaticon.com/512/854/854878.png'
];

// התקנת ה-Service Worker ושמירת נכסים ב-Cache
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// אקטיבציה וניקוי Caches ישנים
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// אסטרטגיית Cache First מול רשת
self.addEventListener('fetch', (e) => {
  // בקשות ל-Google Apps Script לא נשמרות ב-Cache הסטטי כדי למנוע שיבוש בסנכרון
  if (e.request.url.includes('script.google.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request).then((fetchRes) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // שמירה ב-Cache של משאבים חדשים שאינם בקשות Script
          if (e.request.method === 'GET' && !e.request.url.includes('script.google.com')) {
            cache.put(e.request, fetchRes.clone());
          }
          return fetchRes;
        });
      });
    }).catch(() => {
      // אם אין רשת ואין ב-Cache
      if (e.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});