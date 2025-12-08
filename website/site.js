(async () => {
  try {
    const r = await fetch('/api/site-content');
    const j = await r.json();
    const c = j?.data || {};
    const isCustomDomain = /instalacjeserwis\.pl$/i.test(window.location.hostname);
    const fallbackBase = 'https://web-production-fc58d.up.railway.app';
    const resolveImg = (src) => {
      try {
        if (!src) return src;
        if (/^https?:\/\//i.test(src)) return src;
        if (src.startsWith('/uploads/') && isCustomDomain) return fallbackBase + src;
        return src;
      } catch (_) { return src; }
    };
    if (c.hero) {
      const ht = document.getElementById('hero-title');
      const hs = document.getElementById('hero-subtitle');
      if (ht) ht.textContent = c.hero.title || ht.textContent;
      if (hs) hs.textContent = c.hero.subtitle || hs.textContent;
      const cc = document.getElementById('cta-client');
      if (cc) { cc.textContent = c.hero.ctaClient?.label || cc.textContent; cc.href = c.hero.ctaClient?.href || cc.href; }
      const ct = document.getElementById('cta-tech');
      if (ct) {
        ct.textContent = c.hero.ctaTech?.label || ct.textContent;
        ct.href = c.hero.ctaTech?.href || ct.href;
        if ((ct.textContent || '').trim() === 'Logowanie dla serwisantów') {
          ct.textContent = 'Formularz zgłoszenia serwisowego';
        }
      }
    }

    if (Array.isArray(c.services)) {
      const grid = document.getElementById('services-grid');
      if (grid) {
        const items = Array.isArray(c.services) ? c.services : [];
        if (items.length) grid.innerHTML = '';
        const iconBg = {
          water: 'bg-sky-100 text-sky-600', radiator: 'bg-blue-100 text-blue-600', gas:'bg-rose-100 text-rose-600', boiler:'bg-indigo-100 text-indigo-600'
        };
        const iconSvg = {
          water: '<path d="M12 2a7 7 0 0 0-7 7v2H3a1 1 0 1 0 0 2h2v2a7 7 0 0 0 14 0v-2h2a1 1 0 1 0 0-2h-2V9a7 7 0 0 0-7-7Z"/>',
          radiator: '<path d="M20 8H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2ZM7 6h10l1-2H6l1 2Z"/>',
          gas: '<path d="M12 3c2 2.5 3 4.833 3 7a3 3 0 1 1-6 0c0-2.167 1-4.5 3-7Z"/>',
          boiler: '<path d="M5 6h14v12H5zM3 8h2v8H3zm16 0h2v8h-2z"/>'
        };
        for (const s of items) {
          const a = document.createElement('a'); a.className = 'rounded-xl bg-white border border-slate-200 p-5 hover:shadow-sm transition';
          let href = s.href || '#';
          try {
            const titleRaw = String(s.title || '');
            // Normalizuj diakrytyki i różne myślniki, aby dopasowania działały stabilnie
            const title = titleRaw
              .toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // usuń diakrytyki
              .replace(/[\u2010-\u2015\u2212]/g, '-') // różne myślniki → '-'
              .replace(/ł/g,'l');
            if ((!href || href === '#') && (title.includes('wod') || title.includes('wod-kan'))) {
              href = '/site/instalacje-wod-kan';
            } else if ((!href || href === '#') && (title.includes('ogrzew') || title.includes('podlog'))) {
              href = '/site/ogrzewanie-podlogowka';
            } else if ((!href || href === '#') && (title.includes('gazow'))) {
              href = '/site/instalacje-gazowe';
            } else if ((!href || href === '#') && (title.includes('kotlown') || title.includes('kotlow'))) {
              href = '/site/kotlownie-i-serwis-kotlow';
            } else if ((!href || href === '#') && (title.includes('dlaczego my') || title.includes('dlaczego-my') || title.includes('dlaczego  my') || title.includes('dlaczego'))) {
              href = '/site/dlaczego-my';
            } else if ((!href || href === '#') && (title.includes('serwis 24/7') || title.includes('serwis') || title.includes('24/7'))) {
              href = '/site/serwis-szybka-reakcja';
            }
          } catch (_) {}
          a.href = href;
          const wrap = document.createElement('div'); wrap.className = `h-9 w-9 rounded-md grid place-content-center mb-2 ${iconBg[s.icon] || 'bg-slate-100 text-slate-600'}`;
          wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">${iconSvg[s.icon] || iconSvg.water}</svg>`;
          a.appendChild(wrap);
          const t = document.createElement('div'); t.className='font-semibold'; t.textContent = s.title || 'Usługa'; a.appendChild(t);
          const d = document.createElement('div'); d.className='text-sm text-slate-600'; d.textContent = s.description || ''; a.appendChild(d);
          grid.appendChild(a);
        }
      }
    }

    if (Array.isArray(c.banners) && c.banners.length) {
      const container = document.createElement('section');
      container.className = 'max-w-7xl mx-auto px-6 pb-8';
      const list = c.banners.filter(b => (b.position||'below_hero') === 'below_hero');
      for (const b of list) {
        const card = document.createElement('a');
        let href = b.href || '#';
        try {
          const t = String(b.title||'').toLowerCase();
          if ((!href || href === '#') && (t.includes('serwis') && (t.includes('24/7') || t.includes('24')))) {
            href = '/site/serwis-szybka-reakcja';
          } else if ((!href || href === '#') && t.includes('dlaczego')) {
            href = '/site/dlaczego-my';
          }
        } catch (_) {}
        card.href = href;
        card.className = 'block rounded-2xl overflow-hidden border bg-white/70 hover:shadow-sm transition mb-4';
        card.innerHTML = `
          <div class="grid md:grid-cols-3">
            <div class="p-6 md:col-span-2">
              <div class="text-xl font-semibold">${(b.title||'').replace(/</g,'&lt;')}</div>
              <div class="text-slate-600 mt-1">${(b.subtitle||'').replace(/</g,'&lt;')}</div>
            </div>
            <div class="relative h-40 md:h-full bg-slate-100">${b.image ? `<img src="${resolveImg(b.image)}" class="absolute inset-0 w-full h-full object-cover"/>` : ''}</div>
          </div>`;
        container.appendChild(card);
      }
      const anchor = document.getElementById('uslugi');
      if (anchor && anchor.parentElement) {
        document.body.insertBefore(container, anchor.parentElement.nextSibling);
      }
    }

    // Update marquee text if available
    try {
      const txt = (c.hero && c.hero.marqueeText) ? String(c.hero.marqueeText) : '';
      if (txt) {
        const bar = document.querySelector('#hero-rotator a .animate-marquee');
        if (bar) bar.innerHTML = `<span class="mx-6">${txt}</span><span class="mx-6">${txt}</span>`;
      }
    } catch (_) {}

    // Footer from CMS
    try {
      const ft = document.getElementById('footer-text');
      if (ft && c.footer && c.footer.text) ft.textContent = String(c.footer.text);
    } catch (_) {}

    if (Array.isArray(c.blocks) && c.blocks.length) {
      const wrap = document.createElement('section');
      wrap.className = 'max-w-7xl mx-auto px-6 pb-12';
      for (const bl of c.blocks) {
        let href = bl.href || '';
        try {
          const t = String(bl.heading||'').toLowerCase();
          if ((!href || href === '#') && t.includes('dlaczego')) {
            href = '/site/dlaczego-my';
          } else if ((!href || href === '#') && (t.includes('serwis') && (t.includes('24/7') || t.includes('24')))) {
            href = '/site/serwis-szybka-reakcja';
          }
        } catch (_) {}
        const el = document.createElement(href ? 'a' : 'div');
        if (href) el.setAttribute('href', href);
        el.className = 'bg-white border rounded-xl p-6 mb-4 block';
        el.innerHTML = `
          <h3 class="text-lg font-semibold mb-2">${(bl.heading||'').replace(/</g,'&lt;')}</h3>
          <p class="text-slate-700 whitespace-pre-wrap">${(bl.body||'').replace(/</g,'&lt;')}</p>
          ${bl.image ? `<img src="${resolveImg(bl.image)}" class="mt-3 rounded-lg w-full object-cover"/>` : ''}
        `;
        wrap.appendChild(el);
      }
      const footer = document.getElementById('kontakt');
      if (footer && footer.parentElement) footer.parentElement.insertBefore(wrap, footer);
    }

    try {
      const me = await fetch('/api/cms/me', { credentials: 'include' }).then(x=>x.json()).catch(()=>({}));
      const isAdmin = !!(me && me.isAdmin);
      if (isAdmin) {
        const toggle = document.createElement('button');
        toggle.textContent = 'Edytuj stronę';
        toggle.className = 'fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg bg-indigo-600 text-white shadow';
        document.body.appendChild(toggle);
        let editing = false;

        // Helpers to save content
        const apiPut = (url, body) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });
        // Simple image picker modal
        const modal = document.getElementById('imagePickerModal');
        const modalGrid = document.getElementById('imagePickerGrid');
        const modalClose = document.getElementById('imagePickerClose');
        const openImagePicker = async (onPick) => {
          try {
            if (!modal || !modalGrid) return;
            modalGrid.innerHTML = '<div class="text-sm text-slate-500">Ładowanie…</div>';
            const items = await fetch('/api/uploads/list-proxy?limit=40').then(r=>r.json()).then(j=>Array.isArray(j.items)?j.items:[]).catch(()=>[]);
            modalGrid.innerHTML = '';
            items.forEach(it => {
              const card = document.createElement('div'); card.className = 'border rounded overflow-hidden';
              card.innerHTML = `<img src="${it.url}" class="w-full h-24 object-cover"/><button data-pick-url="${it.url}" class="w-full px-2 py-1 text-xs bg-indigo-600 text-white">Użyj tego</button>`;
              modalGrid.appendChild(card);
            });
            modal.classList.remove('hidden'); modal.classList.add('flex');
            modalGrid.onclick = (e) => {
              const btn = e.target.closest('button[data-pick-url]');
              if (!btn) return;
              const url = btn.getAttribute('data-pick-url');
              modal.classList.add('hidden'); modal.classList.remove('flex');
              onPick && onPick(url);
            };
            modalClose && (modalClose.onclick = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); });
          } catch (_) {}
        };

        const addEditBtn = (parent, onClick) => {
          const b = document.createElement('button');
          b.textContent = 'Edytuj';
          b.className = 'absolute top-2 right-2 text-xs px-2 py-1 rounded bg-yellow-500 text-white shadow';
          b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClick(); });
          parent.style.position = 'relative';
          parent.appendChild(b);
        };

        const enableEdit = () => {
          editing = true; toggle.textContent = 'Zakończ edycję';
          // Inline editor helper
          const startInlineEdit = (targets, options) => {
            const els = Array.isArray(targets) ? targets.filter(Boolean) : [targets].filter(Boolean);
            if (!els.length) return { cancel:()=>{}, save:async()=>{} };
            const originals = els.map(el => el.textContent);
            els.forEach(el => { el.contentEditable = 'true'; el.classList.add('outline','outline-2','outline-indigo-300','bg-yellow-50'); });
            const parent = els[0].parentElement || els[0];
            const bar = document.createElement('div'); bar.className = 'absolute -top-3 right-2 z-40 flex gap-2';
            const wrap = document.createElement('div'); wrap.className = 'px-2 py-1 rounded bg-white shadow border flex items-center gap-2 text-xs';
            const extra = document.createElement('div'); extra.className = 'flex items-center gap-2'; wrap.appendChild(extra);
            const btnSave = document.createElement('button'); btnSave.textContent = 'Zapisz'; btnSave.className = 'px-2 py-1 rounded bg-green-600 text-white';
            const btnCancel = document.createElement('button'); btnCancel.textContent = 'Anuluj'; btnCancel.className = 'px-2 py-1 rounded bg-slate-200';
            wrap.appendChild(btnSave); wrap.appendChild(btnCancel); bar.appendChild(wrap);
            parent.style.position = 'relative'; parent.appendChild(bar);
            const inputs = {};
            if (options && Array.isArray(options.inputs)) {
              for (const inp of options.inputs) {
                const input = document.createElement('input');
                input.value = String(inp.value || ''); input.placeholder = inp.placeholder || ''; input.className = 'border rounded px-2 py-1';
                extra.appendChild(input); inputs[inp.name] = input;
              }
            }
            const cancel = () => { els.forEach((el,i)=> { el.textContent = originals[i]; el.contentEditable = 'false'; el.classList.remove('outline','outline-2','outline-indigo-300','bg-yellow-50'); }); bar.remove(); };
            const save = async () => {
              const texts = els.map(el => el.textContent && el.textContent.trim() ? el.textContent : originals[els.indexOf(el)]);
              try { await (options && options.onSave ? options.onSave({ texts, inputs }) : Promise.resolve()); } finally { cancel(); }
            };
            btnCancel.onclick = (e)=> { e.preventDefault(); cancel(); };
            btnSave.onclick = async (e)=> { e.preventDefault(); await save(); };
            return { cancel, save };
          };
          // HERO inline edit
          try {
            const t = document.getElementById('hero-title');
            const s = document.getElementById('hero-subtitle');
            const cc = document.getElementById('cta-client');
            const ct = document.getElementById('cta-tech');
            addEditBtn(t.parentElement || t, async () => {
              startInlineEdit([t,s], { inputs: [
                { name:'clientHref', value: cc?.getAttribute('href') || '', placeholder:'CTA Klient link' },
                { name:'techHref', value: ct?.getAttribute('href') || '', placeholder:'CTA Technik link' }
              ], onSave: async ({ texts, inputs }) => {
                const [title, subtitle] = texts; const clientHref = inputs.clientHref.value || cc?.getAttribute('href') || '#'; const techHref = inputs.techHref.value || ct?.getAttribute('href') || '#';
                await apiPut('/api/site-content/hero', { title, subtitle, ctaClient: { label: cc.textContent.trim(), href: clientHref }, ctaTech: { label: ct.textContent.trim(), href: techHref } });
                t.textContent = title; s.textContent = subtitle; cc && cc.setAttribute('href', clientHref); ct && ct.setAttribute('href', techHref);
              }});
            });
            // Marquee text edit button (on the hero action bar if present)
            try {
              const barWrap = document.querySelector('#hero-rotator');
              if (barWrap) {
                addEditBtn(barWrap, async () => {
                  const txt = prompt('Tekst paska (marquee)', (c.hero && c.hero.marqueeText) || 'Wyślij zgłoszenie serwisowe — kliknij tutaj') || '';
                  await apiPut('/api/site-content/hero', { marqueeText: txt });
                  const bar = document.querySelector('#hero-rotator a .animate-marquee');
                  if (bar) bar.innerHTML = `<span class="mx-6">${txt}</span><span class="mx-6">${txt}</span>`;
                  c.hero = { ...(c.hero||{}), marqueeText: txt };
                });
              }
            } catch (_) {}
          } catch (_) {}

          // Services edit buttons
          try {
            const grid = document.getElementById('services-grid');
            if (grid) {
              const cards = Array.from(grid.querySelectorAll('a'));
              cards.forEach((card, i) => {
                addEditBtn(card, async () => {
                  const titleEl = card.querySelector('.font-semibold'); const descEl = card.querySelector('.text-sm');
                  startInlineEdit([titleEl, descEl], { inputs: [{ name:'href', value: card.getAttribute('href') || '', placeholder:'Link' }], onSave: async ({ texts, inputs }) => {
                    const [newTitle, newDesc] = texts; const newHref = inputs.href.value || card.getAttribute('href') || '#';
                    const curr = Array.isArray(c.services) ? c.services : []; const items = curr.map((x, idx) => idx === i ? { ...x, title: newTitle, description: newDesc, href: newHref } : x);
                    await apiPut('/api/site-content/services', items); titleEl.textContent = newTitle; descEl.textContent = newDesc; card.setAttribute('href', newHref);
                  }});
                });
              });
            }
          } catch (_) {}

          // Blocks edit buttons
          try {
            const blocks = document.querySelectorAll('section .bg-white.border.rounded-xl.p-6.mb-4.block');
            blocks.forEach((blk, i) => {
              addEditBtn(blk, async () => {
                const h = blk.querySelector('h3');
                const p = blk.querySelector('p');
                const newH = prompt('Nagłówek', h?.textContent || '') || '';
                const newB = prompt('Treść', p?.textContent || '') || '';
                const curr = Array.isArray(c.blocks) ? c.blocks : [];
                const items = curr.map((x, idx) => idx === i ? { ...x, heading: newH, body: newB } : x);
                await apiPut('/api/site-content/blocks', items);
                h.textContent = newH; p.textContent = newB;
              });
            });
          } catch (_) {}

          // Banners edit buttons (title/subtitle/link/image)
          try {
            const bannerCards = document.querySelectorAll('section .block.rounded-2xl.overflow-hidden.border');
            const curr = Array.isArray(c.banners) ? c.banners : [];
            bannerCards.forEach((card, i) => {
              addEditBtn(card, async () => {
                const tEl = card.querySelector('.text-xl');
                const sEl = card.querySelector('.text-slate-600');
                const imgEl = card.querySelector('img');
                const newTitle = prompt('Tytuł banera', tEl?.textContent || (curr[i]?.title || '')) || '';
                const newSub = prompt('Podtytuł banera', sEl?.textContent || (curr[i]?.subtitle || '')) || '';
                const newHref = prompt('Link banera', card.getAttribute('href') || (curr[i]?.href || '#')) || '#';
                // Wybór obrazu przez modal
                let newImage = curr[i]?.image || '';
                await new Promise((resolve)=> {
                  openImagePicker((url)=> { newImage = url; resolve(); });
                });
                const items = curr.map((x, idx) => idx === i ? { ...x, title: newTitle, subtitle: newSub, href: newHref, image: newImage } : x);
                await apiPut('/api/site-content/banners', items);
                if (tEl) tEl.textContent = newTitle; if (sEl) sEl.textContent = newSub; card.setAttribute('href', newHref); if (imgEl) imgEl.src = newImage;
                c.banners = items;
              });
            });
          } catch (_) {}

          // Footer edit button
          try {
            const ft = document.getElementById('footer-text');
            if (ft) {
              addEditBtn(ft, async () => {
                const txt = prompt('Tekst stopki', ft.textContent || (c.footer && c.footer.text) || '') || '';
                const body = {
                  hero: c.hero || {},
                  services: Array.isArray(c.services) ? c.services : [],
                  banners: Array.isArray(c.banners) ? c.banners : [],
                  blocks: Array.isArray(c.blocks) ? c.blocks : [],
                  footer: { text: txt }
                };
                await apiPut('/api/site-content', body);
                ft.textContent = txt;
                c.footer = { text: txt };
              });
            }
          } catch (_) {}
        };

        const disableEdit = () => { editing = false; toggle.textContent = 'Edytuj stronę'; location.reload(); };
        toggle.onclick = () => editing ? disableEdit() : enableEdit();
      }
    } catch (_) {}
  } catch (_) {}
})();

// Fallback: jeśli CMS nie zwrócił treści, dociągnij linki do kafelków po samych tytułach
(function applyServicesHrefFallback(){
  try {
    const grid = document.getElementById('services-grid');
    if (!grid) return;
    const anchors = Array.from(grid.querySelectorAll('a[href="#"], a:not([href])'));
    if (!anchors.length) return;
    const norm = (s) => String(s||'')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/ł/g,'l');
    for (const a of anchors) {
      const titleEl = a.querySelector('.font-semibold');
      const title = norm(titleEl ? titleEl.textContent : a.textContent);
      let href = '';
      if (title.includes('wod') || title.includes('wod-kan')) href = '/site/instalacje-wod-kan';
      else if (title.includes('ogrzew') || title.includes('podlog')) href = '/site/ogrzewanie-podlogowka';
      else if (title.includes('gazow')) href = '/site/instalacje-gazowe';
      else if (title.includes('kotlown') || title.includes('kotlow')) href = '/site/kotlownie-i-serwis-kotlow';
      if (href) a.setAttribute('href', href);
    }
  } catch (_) {}
})();
