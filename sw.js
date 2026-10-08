const CACHE='murottal-quran-v4';
const SHELL=['./','./index.html','./style.css','./script.js','./manifest.webmanifest','./assets/hero.jpg'];
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('murottal-quran-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;
  if(req.method!=='GET')return;
  const fresh=req.mode==='navigate'||['script','style'].includes(req.destination);
  if(fresh){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{
      const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res;
    }).catch(()=>caches.match(req).then(c=>c||caches.match('./index.html'))));
  }else{
    event.respondWith(caches.match(req).then(c=>c||fetch(req).then(res=>{
      const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res;
    })));
  }
});
