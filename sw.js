const CACHE='murottal-quran-v3';
const SHELL=['./','./index.html','./style.css','./script.js','./manifest.webmanifest','./assets/hero.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin===location.origin){
    e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{
      const copy=r.clone();caches.open(CACHE).then(x=>x.put(e.request,copy));return r;
    }).catch(()=>caches.match('./index.html'))));
  }
});
