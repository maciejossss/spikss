(function(){
  const wrap = document.getElementById('hero-rotator');
  if (!wrap) return;
  const cards = Array.from(wrap.querySelectorAll('.rotate-card img'));
  if (!cards.length) return;

  let images = [];
  async function loadImages(){
    try{
      // Prefer admin-selected gallery; fallback to recent uploads
      const rSel = await fetch('/api/site-content/gallery');
      const jSel = await rSel.json().catch(()=>({}));
      const sel = Array.isArray(jSel.items) ? jSel.items : [];
      const isCustomDomain = /instalacjeserwis\.pl$/i.test(window.location.hostname);
      const fallbackBase = 'https://web-production-fc58d.up.railway.app';
      const resolve = (u) => {
        try {
          if (!u) return u;
          if (/^https?:\/\//i.test(u)) return u;
          if (u.startsWith('/uploads/') && isCustomDomain) return '/uploads-proxy/' + u.split('/').pop();
          return u;
        } catch(_) { return u; }
      };
      images = sel.slice(0,10).map(resolve);
      if (!images.length) {
        // Fallback: use latest uploads if no explicit selection
        const rList = await fetch('/api/uploads/list-proxy?limit=10');
        const jList = await rList.json().catch(()=>({ items: [] }));
        const items = Array.isArray(jList.items) ? jList.items : [];
        images = items.map(it => resolve(it.url)).slice(0,10);
      }
    }catch(_){
      images = [];
    }
  }

  function fadeSwap(imgEl, src){
    if (imgEl.getAttribute('src') === src) return;
    imgEl.style.opacity = 0;
    setTimeout(() => { imgEl.src = src; imgEl.onload = () => { imgEl.style.opacity = 1; }; }, 100);
  }

  let idx = 0;
  function tick(){
    if (!images.length) return;
    cards.forEach((imgEl, i) => {
      const src = images[(idx + i) % images.length];
      fadeSwap(imgEl, src);
      // subtle rotate animation per card
      const parent = imgEl.parentElement;
      if (parent){ parent.style.transition = 'transform 1s ease'; parent.style.transform = 'rotate(2deg)'; setTimeout(()=>{ parent.style.transform = 'rotate(0deg)'; }, 900); }
    });
    idx = (idx + 1) % images.length;
  }

  loadImages().then(() => { tick(); setInterval(tick, 4000); });
})();


