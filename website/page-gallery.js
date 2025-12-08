(function(){
  document.addEventListener('DOMContentLoaded', async function(){
    const gallery = document.getElementById('gallery');
    const gimg = document.getElementById('gimg');
    const ginfo = document.getElementById('ginfo');
    if (!gallery || !gimg) return;
    const slug = gallery.dataset && gallery.dataset.slug;
    if (!slug) return;
    const isCustomDomain = /instalacjeserwis\.pl$/i.test(window.location.hostname);
    const resolve = (u) => {
      try {
        if (!u) return u;
        if (/^https?:\/\//i.test(u)) return u;
        if (u.startsWith('/uploads/') && isCustomDomain) return '/uploads-proxy/' + u.split('/').pop();
        return u;
      } catch(_) { return u; }
    };
    try {
      // Prefer explicit page gallery
      let images = [];
      try {
        const r = await fetch('/api/site-content/gallery/' + encodeURIComponent(slug));
        const j = await r.json().catch(()=>({}));
        const list = Array.isArray(j.items) ? j.items : [];
        images = (list || []).map(resolve);
      } catch(_) { images = []; }
      // Fallback: latest uploads matching slug prefix
      if (!images.length) {
        try {
          const r2 = await fetch('/api/uploads/list-proxy?limit=10&prefix=' + encodeURIComponent(slug));
          const j2 = await r2.json().catch(()=>({ items: [] }));
          images = (Array.isArray(j2.items) ? j2.items : []).map(it => resolve(it.url));
        } catch(_) { images = []; }
      }
      if (!images.length) return;
      let idx = 0;
      const show = () => {
        const src = images[idx % images.length];
        gimg.style.opacity = 0;
        setTimeout(() => { gimg.src = src; gimg.onload = () => { gimg.style.opacity = 1; }; }, 100);
        if (ginfo) ginfo.textContent = 'Zdjęcie: ' + (src.split('/').pop());
        idx++;
      };
      show();
      setInterval(show, 4000);
    } catch (_) {}
  });
})();


