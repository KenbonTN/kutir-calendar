// Kutir service worker: keeps the app opening offline and shows the evening reminder.

const CACHE = "kutir-v4";
const SCOPE = new URL(self.registration.scope).pathname; // "/kutir-calendar/" on GitHub Pages

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const res = await fetch(SCOPE, { cache: "no-cache" });
      if (!res.ok) return;
      await saveFiles(cache, await res.clone().text());
      await cache.put(SCOPE, res);
    })().catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("kutir-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Downloads (once) every build file a page refers to; throws if any can't be fetched. */
async function saveFiles(cache, html) {
  const files = [...new Set(html.match(/(?:\/[\w.-]+)*\/_next\/static\/[\w.\/-]+\.(?:js|css|woff2)/g) || [])];
  await Promise.all(
    files.map(async (f) => {
      if (await cache.match(f)) return;
      const r = await fetch(f);
      if (!r.ok) throw new Error(`missing ${f}`);
      await cache.put(f, r);
    }),
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  // The dev server reuses file names between edits, so caching there serves stale code.
  if (self.location.hostname === "localhost") return;

  // Pages: the saved copy straight away, so Kutir opens instantly even on a slow
  // connection. A fresh copy is fetched in the background (asking the server, not the
  // phone's HTTP cache); if it changed, open pages are told so they can offer a refresh,
  // and the next open uses it. With nothing saved yet, it comes from the network.
  if (req.mode === "navigate") {
    const fresh = fetch(req, { cache: "no-cache" }).then(async (res) => {
      if (!res.ok) return res;
      const cache = await caches.open(CACHE);
      const old = await cache.match(SCOPE);
      const [a, b] = await Promise.all([old ? old.clone().text() : null, res.clone().text()]);
      if (a !== b) {
        // Save the build files the new page needs first, so the saved page always works,
        // even offline or after a later update replaced those files on the server.
        await saveFiles(cache, b);
        await cache.put(SCOPE, res.clone());
        if (a != null) {
          const list = await self.clients.matchAll({ type: "window" });
          list.forEach((c) => c.postMessage({ type: "kutir-update" }));
        }
      }
      return res;
    });
    event.respondWith(caches.match(SCOPE).then((hit) => hit || fresh.catch(() => Response.error())));
    event.waitUntil(fresh.catch(() => {}));
    return;
  }

  // Build files have unique names, so a saved copy never goes stale.
  if (url.pathname.includes("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Everything else (icons, fonts, manifest): saved copy first, refreshed in the background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    }),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Kutir", {
      body: data.body || "Check today's tasks before the day ends.",
      icon: `${SCOPE}icon-192.png`,
      badge: `${SCOPE}icon-192.png`,
      tag: "kutir-evening",
      data: { url: data.url || SCOPE },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || SCOPE;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.includes(SCOPE) && "focus" in c) return c.focus();
      return self.clients.openWindow(target);
    }),
  );
});
