const cacheName = 'dipo-workspace-v1'

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  const isHome = request.mode === 'navigate' && url.pathname === '/' && !url.search
  const isAsset = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/fonts/')
  if (!isHome && !isAsset) return

  event.respondWith((async () => {
    const cache = await caches.open(cacheName)
    if (isAsset) {
      const saved = await cache.match(request)
      if (saved) return saved
    }
    try {
      const response = await fetch(request)
      if (response.ok) await cache.put(request, response.clone()).catch(() => undefined)
      return response
    } catch {
      return (await cache.match(request)) ?? Response.error()
    }
  })())
})
