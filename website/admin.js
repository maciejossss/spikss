(() => {
  const $ = (id) => document.getElementById(id);
  const API = {
    base: '',
    key() { return localStorage.getItem('cmsKey') || ''; },
    headers() { return this.key() ? { 'x-admin-password': this.key(), 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }; },
    // Session auth
    async loginWithPassword(pw) {
      const r = await fetch('/api/cms/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      if (!r.ok) throw new Error('Błędne hasło');
      return r.json();
    },
    async logout() {
      await fetch('/api/cms/logout', { method: 'POST' });
    },
    async getContent() {
      const r = await fetch('/api/site-content', { headers: this.headers() });
      const j = await r.json().catch(()=>({}));
      return j.data || {};
    },
    async updateHero(payload) {
      const r = await fetch('/api/site-content/hero', { method: 'PUT', headers: this.headers(), body: JSON.stringify(payload), credentials: 'include' });
      if (!r.ok) throw new Error('Unauthorized or server error');
      return r.json();
    },
    async updateServices(items) {
      const r = await fetch('/api/site-content/services', { method: 'PUT', headers: this.headers(), body: JSON.stringify(items), credentials: 'include' });
      if (!r.ok) throw new Error('Unauthorized or server error');
      return r.json();
    },
    // Banners
    async getBanners() {
      const r = await fetch('/api/site-content/banners', { headers: this.headers() });
      const j = await r.json().catch(()=>({}));
      return j.data || [];
    },
    async updateBanners(items) {
      const r = await fetch('/api/site-content/banners', { method: 'PUT', headers: this.headers(), body: JSON.stringify(items), credentials: 'include' });
      if (!r.ok) throw new Error('Unauthorized or server error');
      return r.json();
    },
    // Blocks
    async getBlocks() {
      const r = await fetch('/api/site-content/blocks', { headers: this.headers() });
      const j = await r.json().catch(()=>({}));
      return j.data || [];
    },
    async updateBlocks(items) {
      const r = await fetch('/api/site-content/blocks', { method: 'PUT', headers: this.headers(), body: JSON.stringify(items), credentials: 'include' });
      if (!r.ok) throw new Error('Unauthorized or server error');
      return r.json();
    },
    async upload(file) {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/site-content/upload', { method: 'POST', headers: { 'x-admin-password': this.key() }, body: fd, credentials: 'include' });
      if (!r.ok) {
        const msg = r.status === 401 ? 'Brak uprawnień – zaloguj się w CMS i spróbuj ponownie.' : 'Upload failed';
        throw new Error(msg);
      }
      return r.json();
    },
    async listUploads() {
      const r = await fetch('/api/uploads/list');
      const j = await r.json().catch(()=>({}));
      return Array.isArray(j.items) ? j.items : [];
    },
    async replace(name, file) {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/uploads/replace/' + encodeURIComponent(name), { method: 'POST', headers: { 'x-admin-password': this.key() }, body: fd, credentials: 'include' });
      if (!r.ok) throw new Error('Replace failed');
      return r.json();
    },
    async saveGallerySelection(urls) {
      const r = await fetch('/api/site-content/gallery', { method: 'PUT', headers: this.headers(), body: JSON.stringify(urls), credentials: 'include' });
      if (!r.ok) throw new Error('Save selection failed');
      return r.json();
    },
    async getGallerySelection() {
      const r = await fetch('/api/site-content/gallery');
      const j = await r.json().catch(()=>({}));
      return Array.isArray(j.items) ? j.items : [];
    },
    async getPages() {
      const r = await fetch('/api/site-content/pages');
      const j = await r.json().catch(()=>({}));
      return Array.isArray(j.items) ? j.items : [];
    },
    async getPageGallery(slug) {
      const r = await fetch('/api/site-content/gallery/' + encodeURIComponent(slug));
      const j = await r.json().catch(()=>({}));
      return Array.isArray(j.items) ? j.items : [];
    },
    async savePageGallery(slug, urls) {
      const r = await fetch('/api/site-content/gallery/' + encodeURIComponent(slug), { method: 'PUT', headers: this.headers(), body: JSON.stringify(urls), credentials: 'include' });
      if (!r.ok) throw new Error('Save page gallery failed');
      return r.json();
    }
  };

  function toast(msg, ok=true) {
    const el = document.createElement('div');
    el.className = `fixed top-4 right-4 px-4 py-2 rounded shadow text-white ${ok?'bg-green-600':'bg-red-600'}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(()=> el.remove(), 2500);
  }

  function renderServices(list) {
    const wrap = $('services');
    wrap.innerHTML = '';
    (list || []).forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border rounded';
      row.innerHTML = `
        <input data-field="icon" data-i="${i}" value="${s.icon||''}" class="border rounded px-3 py-2" placeholder="ikona (np. water)" />
        <input data-field="title" data-i="${i}" value="${s.title||''}" class="border rounded px-3 py-2" placeholder="tytuł" />
        <input data-field="description" data-i="${i}" value="${s.description||''}" class="border rounded px-3 py-2" placeholder="opis" />
        <input data-field="href" data-i="${i}" value="${s.href||''}" class="border rounded px-3 py-2" placeholder="/link" />
      `;
      wrap.appendChild(row);
    });
  }

  async function load() {
    try {
      const data = await API.getContent();
      $('heroTitle').value = data?.hero?.title || '';
      $('heroSubtitle').value = data?.hero?.subtitle || '';
      $('ctaClientLabel').value = data?.hero?.ctaClient?.label || '';
      $('ctaClientHref').value = data?.hero?.ctaClient?.href || '';
      $('ctaTechLabel').value = data?.hero?.ctaTech?.label || '';
      $('ctaTechHref').value = data?.hero?.ctaTech?.href || '';
      $('colorPrimary').value = data?.hero?.colors?.primary || '#2563eb';
      $('colorAccent').value = data?.hero?.colors?.accent || '#06b6d4';
      $('marqueeText').value = data?.hero?.marqueeText || '';
      renderServices(Array.isArray(data.services) ? data.services : []);

      // Banners
      const banners = Array.isArray(data.banners) ? data.banners : await API.getBanners();
      renderBanners(banners);

      // Blocks
      const blocks = Array.isArray(data.blocks) ? data.blocks : await API.getBlocks();
      renderBlocks(blocks);
    } catch (e) {
      toast('Błąd ładowania treści', false);
    }
  }

  function renderBanners(items) {
    const wrap = $('banners');
    if (!wrap) return;
    wrap.innerHTML = '';
    (items || []).forEach((b, i) => {
      const row = document.createElement('div');
      row.className = 'grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded';
      row.innerHTML = `
        <input data-kind="banners" data-field="title" data-i="${i}" value="${b.title||''}" class="border rounded px-3 py-2" placeholder="tytuł" />
        <input data-kind="banners" data-field="subtitle" data-i="${i}" value="${b.subtitle||''}" class="border rounded px-3 py-2" placeholder="podtytuł" />
        <div class="flex items-center gap-2">
          <input style="flex:1" data-kind="banners" data-field="image" data-i="${i}" value="${b.image||''}" class="border rounded px-3 py-2" placeholder="URL obrazu" />
          <button data-open-banner-gallery="${i}" class="px-2 py-2 text-xs bg-slate-100 rounded">Wybierz…</button>
        </div>
        <input data-kind="banners" data-field="href" data-i="${i}" value="${b.href||''}" class="border rounded px-3 py-2" placeholder="/link" />
        <select data-kind="banners" data-field="position" data-i="${i}" class="border rounded px-3 py-2">
          <option value="below_hero" ${b.position==='below_hero'?'selected':''}>Pod HERO</option>
          <option value="above_footer" ${b.position==='above_footer'?'selected':''}>Nad stopką</option>
        </select>
      `;
      wrap.appendChild(row);
    });
  }

  async function loadGallery() {
    try {
      const grid = $('galleryGrid');
      if (!grid) return;
      grid.innerHTML = '<div class="text-sm text-slate-500">Ładowanie…</div>';
      const items = await (await fetch('/api/uploads/list?limit=200')).json().then(j=>Array.isArray(j.items)?j.items:[]);
      const selected = await API.getGallerySelection();
      grid.innerHTML = '';
      items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'border rounded bg-slate-50';
        card.innerHTML = `
          <img src="${(it.url||it)}" class="w-full h-32 object-cover"/>
          <div class="flex items-center justify-between p-2 gap-2">
            <label class="flex items-center gap-1 text-xs text-slate-600"><input type="checkbox" data-pick value="${(it.url||it)}" ${selected.includes(it.url)?'checked':''}> Na stronę</label>
            <div class="ml-auto flex items-center gap-2">
              <input type="file" data-replace="${(it.name||'')}" accept="image/*" class="text-xs" />
              <button data-name="${(it.name||'')}" class="px-2 py-1 text-xs rounded bg-red-600 text-white">Usuń</button>
            </div>
          </div>`;
        grid.appendChild(card);
      });
      if (!items.length) grid.innerHTML = '<div class="text-sm text-slate-500">Brak zdjęć w /uploads</div>';
    } catch (_) {}
  }

  function renderBlocks(items) {
    const wrap = $('blocks');
    if (!wrap) return;
    wrap.innerHTML = '';
    (items || []).forEach((b, i) => {
      const row = document.createElement('div');
      row.className = 'space-y-2 p-3 border rounded';
      row.innerHTML = `
        <input data-kind="blocks" data-field="heading" data-i="${i}" value="${b.heading||''}" class="w-full border rounded px-3 py-2" placeholder="nagłówek" />
        <textarea data-kind="blocks" data-field="body" data-i="${i}" rows="3" class="w-full border rounded px-3 py-2" placeholder="treść">${b.body||''}</textarea>
        <div class="flex items-center gap-2">
          <input data-kind="blocks" data-field="image" data-i="${i}" value="${b.image||''}" class="w-full border rounded px-3 py-2" placeholder="URL obrazu (opcjonalnie)" />
          <button data-open-block-gallery="${i}" class="px-2 py-2 text-xs bg-slate-100 rounded">Wybierz…</button>
        </div>
      `;
      wrap.appendChild(row);
    });
  }

  $('saveKey').addEventListener('click', () => {
    const v = $('adminKey').value.trim();
    localStorage.setItem('cmsKey', v);
    toast('Zapisano hasło admina');
  });

  $('loginBtn')?.addEventListener('click', async () => {
    try {
      const v = $('adminKey').value.trim();
      if (!v) { toast('Podaj hasło', false); return; }
      await API.loginWithPassword(v);
      toast('Zalogowano');
      // Po zalogowaniu przejdź do trybu edycji lustrzanej strony
      setTimeout(()=> { window.location.href = '/cms/edit'; }, 300);
    } catch (e) { toast(e.message || 'Logowanie nieudane', false); }
  });

  $('logoutBtn')?.addEventListener('click', async () => {
    await API.logout();
    toast('Wylogowano');
  });

  $('reload').addEventListener('click', load);

  $('addService').addEventListener('click', async () => {
    const wrap = $('services');
    const i = (wrap.children || []).length;
    const row = document.createElement('div');
    row.className = 'grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border rounded';
    row.innerHTML = `
      <input data-field="icon" data-i="${i}" class="border rounded px-3 py-2" placeholder="ikona" />
      <input data-field="title" data-i="${i}" class="border rounded px-3 py-2" placeholder="tytuł" />
      <input data-field="description" data-i="${i}" class="border rounded px-3 py-2" placeholder="opis" />
      <input data-field="href" data-i="${i}" class="border rounded px-3 py-2" placeholder="/link" />
    `;
    wrap.appendChild(row);
  });

  $('addBanner')?.addEventListener('click', () => {
    const wrap = $('banners');
    const i = (wrap.children || []).length;
    const row = document.createElement('div');
    row.className = 'grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded';
    row.innerHTML = `
      <input data-kind="banners" data-field="title" data-i="${i}" class="border rounded px-3 py-2" placeholder="tytuł" />
      <input data-kind="banners" data-field="subtitle" data-i="${i}" class="border rounded px-3 py-2" placeholder="podtytuł" />
      <input data-kind="banners" data-field="image" data-i="${i}" class="border rounded px-3 py-2" placeholder="URL obrazu" />
      <input data-kind="banners" data-field="href" data-i="${i}" class="border rounded px-3 py-2" placeholder="/link" />
      <select data-kind="banners" data-field="position" data-i="${i}" class="border rounded px-3 py-2">
        <option value="below_hero">Pod HERO</option>
        <option value="above_footer">Nad stopką</option>
      </select>
    `;
    wrap.appendChild(row);
  });

  $('saveBanners')?.addEventListener('click', async () => {
    try {
      const fields = Array.from(document.querySelectorAll('#banners [data-kind="banners"][data-field]'));
      const maxIndex = Math.max(0, ...fields.map(f => parseInt(f.getAttribute('data-i')||'0')));
      const items = Array.from({ length: maxIndex + 1 }).map(() => ({ title: '', subtitle: '', image: '', href: '', position: 'below_hero' }));
      fields.forEach(f => {
        const i = parseInt(f.getAttribute('data-i')); const k = f.getAttribute('data-field'); items[i][k] = f.value;
      });
      const filtered = items.filter(x => x.title || x.subtitle || x.image || x.href);
      await API.updateBanners(filtered);
      toast('Zapisano banery');
    } catch (e) { toast(e.message || 'Błąd zapisu banerów', false); }
  });

  // Quick upload for banners – uploads and inserts URL to focused banner image field
  $('bannerUploadBtn')?.addEventListener('click', async () => {
    try {
      const file = $('bannerUpload').files[0];
      if (!file) { toast('Wybierz plik', false); return; }
      const up = await API.upload(file);
      const focused = document.activeElement;
      const target = (focused && focused.matches('input[data-kind="banners"][data-field="image"]')) ? focused : document.querySelector('input[data-kind="banners"][data-field="image"]');
      if (up?.success && up.file?.url && target) target.value = up.file.url;
      toast('Dodano zdjęcie');
    } catch (e) { toast(e.message || 'Błąd uploadu', false); }
  });

  $('refreshGallery')?.addEventListener('click', loadGallery);
  $('uploadGallery')?.addEventListener('click', async () => {
    try {
      const files = $('galleryFiles').files;
      if (!files || !files.length) { toast('Wybierz pliki do wgrania', false); return; }
      const addedUrls = [];
      for (const f of files) {
        const up = await API.upload(f);
        if (up?.success && up.file?.url) addedUrls.push(up.file.url);
      }
      if (addedUrls.length) {
        // Autodolacz do rotatora i zapisz od razu
        const current = await API.getGallerySelection();
        const next = [...current, ...addedUrls].slice(0, 10);
        await API.saveGallerySelection(next);
      }
      toast('Wgrano zdjęcia i dodano do galerii');
      loadGallery();
    } catch (e) { toast(e.message || 'Błąd uploadu', false); }
  });

  $('galleryGrid')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-name]');
    if (!btn) return;
    const name = btn.getAttribute('data-name');
    if (!name) return;
    if (!confirm('Usunąć to zdjęcie?')) return;
    try {
      const r = await fetch('/api/uploads/' + encodeURIComponent(name), { method: 'DELETE', headers: { 'x-admin-password': API.key() } });
      if (!r.ok) throw new Error('Delete failed');
      toast('Usunięto');
      loadGallery();
    } catch (e) { toast(e.message || 'Błąd usuwania', false); }
  });

  $('galleryGrid')?.addEventListener('change', async (e) => {
    const input = e.target.closest('input[data-replace]');
    if (!input) return;
    const name = input.getAttribute('data-replace');
    if (!name || !input.files || !input.files[0]) return;
    try {
      await API.replace(name, input.files[0]);
      toast('Zamieniono zdjęcie');
      loadGallery();
    } catch (err) { toast(err.message || 'Błąd zamiany', false); }
  });

  // Zapis wyboru zdjęć do rotatora
  const saveSelection = async () => {
    try {
      const picks = Array.from(document.querySelectorAll('#galleryGrid input[type="checkbox"][data-pick]:checked')).map(i => i.value);
      await API.saveGallerySelection(picks);
      toast('Zapisano wybór zdjęć');
    } catch (e) { toast(e.message || 'Błąd zapisu wyboru', false); }
  };
  // Dodaj przycisk zapisu obok odśwież
  (function addSaveBtn(){
    const sec = document.getElementById('galleryGrid')?.parentElement;
    const refresh = document.getElementById('refreshGallery');
    if (sec && refresh && !document.getElementById('saveGallerySel')){
      const b = document.createElement('button'); b.id='saveGallerySel'; b.className='px-3 py-2 bg-green-600 text-white rounded text-sm'; b.textContent='Zapisz wybór';
      refresh.parentElement.appendChild(b);
      b.addEventListener('click', saveSelection);
    }
  })();

  // ===== Banner gallery modal =====
  const bannerModal = $('bannerGalleryModal');
  const bannerGrid = $('bannerGalleryGrid');
  const bannerClose = $('bannerGalleryClose');
  document.body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-open-banner-gallery]');
    if (!btn) return;
    const index = btn.getAttribute('data-open-banner-gallery');
    // open modal
    if (bannerModal && bannerGrid){
      bannerModal.classList.remove('hidden'); bannerModal.classList.add('flex');
      bannerGrid.innerHTML = '<div class="text-sm text-slate-500">Ładowanie…</div>';
      const items = await (await fetch('/api/uploads/list?limit=200')).json().then(j=>Array.isArray(j.items)?j.items:[]);
      bannerGrid.innerHTML = '';
      items.forEach(it => {
        const card = document.createElement('div'); card.className = 'border rounded overflow-hidden';
        card.innerHTML = `<img src="${it.url}" class="w-full h-24 object-cover"/><button data-pick-banner="${index}" data-url="${it.url}" class="w-full px-2 py-1 text-xs bg-indigo-600 text-white">Użyj tego</button>`;
        bannerGrid.appendChild(card);
      });
    }
  });
  bannerClose?.addEventListener('click', () => { bannerModal?.classList.add('hidden'); bannerModal?.classList.remove('flex'); });
  bannerGrid?.addEventListener('click', (e) => {
    const pick = e.target.closest('button[data-pick-banner]');
    if (!pick) return;
    const idx = pick.getAttribute('data-pick-banner');
    const url = pick.getAttribute('data-url');
    const input = document.querySelector(`input[data-kind="banners"][data-field="image"][data-i="${idx}"]`);
    if (input) input.value = url;
    bannerModal?.classList.add('hidden'); bannerModal?.classList.remove('flex');
  });

  // ===== Block image picker (reuse banner modal) =====
  document.body.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-open-block-gallery]');
    if (!btn) return;
    const index = btn.getAttribute('data-open-block-gallery');
    if (bannerModal && bannerGrid){
      bannerModal.classList.remove('hidden'); bannerModal.classList.add('flex');
      bannerGrid.innerHTML = '<div class="text-sm text-slate-500">Ładowanie…</div>';
      const items = await (await fetch('/api/uploads/list?limit=200')).json().then(j=>Array.isArray(j.items)?j.items:[]);
      bannerGrid.innerHTML = '';
      items.forEach(it => {
        const card = document.createElement('div'); card.className = 'border rounded overflow-hidden';
        card.innerHTML = `<img src="${it.url}" class="w-full h-24 object-cover"/><button data-pick-block="${index}" data-url="${it.url}" class="w-full px-2 py-1 text-xs bg-indigo-600 text-white">Użyj tego</button>`;
        bannerGrid.appendChild(card);
      });
    }
  });
  bannerGrid?.addEventListener('click', (e) => {
    const pick = e.target.closest('button[data-pick-block]');
    if (!pick) return;
    const idx = pick.getAttribute('data-pick-block');
    const url = pick.getAttribute('data-url');
    const input = document.querySelector(`input[data-kind="blocks"][data-field="image"][data-i="${idx}"]`);
    if (input) input.value = url;
    bannerModal?.classList.add('hidden'); bannerModal?.classList.remove('flex');
  });

  // ===== Page gallery management =====
  async function loadPageGallery() {
    const slug = $('pageSlug').value.trim();
    if (!slug) { toast('Podaj slug podstrony', false); return; }
    const grid = $('pageGalleryGrid');
    grid.innerHTML = '<div class="text-sm text-slate-500">Ładowanie…</div>';
    const all = await (await fetch('/api/uploads/list?limit=200&prefix=' + encodeURIComponent(slug))).json().then(j=>Array.isArray(j.items)?j.items:[]);
    const selected = await API.getPageGallery(slug);
    grid.innerHTML = '';
    all.forEach(it => {
      const card = document.createElement('div');
      card.className = 'border rounded bg-slate-50';
      card.innerHTML = `
        <img src="${(it.url||it)}" class="w-full h-32 object-cover"/>
        <div class="flex items-center justify-between p-2 gap-2">
          <label class="flex items-center gap-1 text-xs text-slate-600"><input type="checkbox" data-pick-page value="${(it.url||it)}" ${selected.includes(it.url)?'checked':''}> Na podstronę</label>
          <div class="ml-auto flex items-center gap-2">
            <input type="file" data-replace-page="${(it.name||'')}" accept="image/*" class="text-xs" />
            <button data-del-page="${(it.name||'')}" class="px-2 py-1 text-xs rounded bg-red-600 text-white">Usuń</button>
          </div>
        </div>`;
      grid.appendChild(card);
    });
  }

  $('loadPageGallery')?.addEventListener('click', loadPageGallery);
  $('uploadPageGallery')?.addEventListener('click', async () => {
    try {
      const files = $('pageGalleryFiles').files;
      if (!files || !files.length) { toast('Wybierz pliki do wgrania', false); return; }
      const slug = $('pageSlug').value.trim();
      if (!slug) { toast('Podaj slug podstrony', false); return; }
      const addedUrls = [];
      for (const f of files) {
        const renamed = new File([f], `${slug}-${f.name}`, { type: f.type });
        const up = await API.upload(renamed);
        if (up?.success && up.file?.url) addedUrls.push(up.file.url);
      }
      if (addedUrls.length) {
        const current = await API.getPageGallery(slug);
        const next = [...current, ...addedUrls].slice(0, 20);
        await API.savePageGallery(slug, next);
      }
      toast('Wgrano zdjęcia dla podstrony');
      loadPageGallery();
    } catch (e) { toast(e.message || 'Błąd uploadu', false); }
  });
  $('savePageGallery')?.addEventListener('click', async () => {
    try {
      const slug = $('pageSlug').value.trim();
      if (!slug) { toast('Podaj slug podstrony', false); return; }
      const picks = Array.from(document.querySelectorAll('#pageGalleryGrid input[type="checkbox"][data-pick-page]:checked')).map(i => i.value);
      await API.savePageGallery(slug, picks);
      toast('Zapisano galerię podstrony');
    } catch (e) { toast(e.message || 'Błąd zapisu galerii', false); }
  });
  $('pageGalleryGrid')?.addEventListener('change', async (e) => {
    const input = e.target.closest('input[data-replace-page]');
    if (!input) return;
    const name = input.getAttribute('data-replace-page');
    if (!name || !input.files || !input.files[0]) return;
    try {
      await API.replace(name, input.files[0]);
      toast('Zamieniono zdjęcie');
      loadPageGallery();
    } catch (err) { toast(err.message || 'Błąd zamiany', false); }
  });
  $('pageGalleryGrid')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-del-page]');
    if (!btn) return;
    const name = btn.getAttribute('data-del-page');
    if (!confirm('Usunąć to zdjęcie?')) return;
    try {
      const r = await fetch('/api/uploads/' + encodeURIComponent(name), { method: 'DELETE', headers: { 'x-admin-password': API.key() } });
      if (!r.ok) throw new Error('Delete failed');
      const slug = $('pageSlug').value.trim();
      // Usuń z galerii tej podstrony jeśli było wybrane
      const current = await API.getPageGallery(slug);
      const next = current.filter(u => !u.endsWith('/' + name));
      await API.savePageGallery(slug, next);
      toast('Usunięto');
      loadPageGallery();
    } catch (e2) { toast(e2.message || 'Błąd usuwania', false); }
  });

  // Populate pages select and auto-load
  async function populatePagesSelect(){
    try {
      const select = $('pageSlug');
      if (!select) return;
      select.innerHTML = '';
      const pages = await API.getPages();
      if (!pages.length) {
        const opt = document.createElement('option'); opt.value=''; opt.textContent='Brak podstron'; select.appendChild(opt); return;
      }
      pages.forEach(p => { const opt = document.createElement('option'); opt.value=p.slug; opt.textContent=p.label || p.slug; select.appendChild(opt); });
      select.addEventListener('change', loadPageGallery);
      // auto-load first page by default
      loadPageGallery();
    } catch (_) {}
  }

  $('addBlock')?.addEventListener('click', () => {
    const wrap = $('blocks');
    const i = (wrap.children || []).length;
    const row = document.createElement('div');
    row.className = 'space-y-2 p-3 border rounded';
    row.innerHTML = `
      <input data-kind="blocks" data-field="heading" data-i="${i}" class="w-full border rounded px-3 py-2" placeholder="nagłówek" />
      <textarea data-kind="blocks" data-field="body" data-i="${i}" rows="3" class="w-full border rounded px-3 py-2" placeholder="treść"></textarea>
    `;
    wrap.appendChild(row);
  });

  $('saveBlocks')?.addEventListener('click', async () => {
    try {
      const fields = Array.from(document.querySelectorAll('#blocks [data-kind="blocks"][data-field]'));
      const maxIndex = Math.max(0, ...fields.map(f => parseInt(f.getAttribute('data-i')||'0')));
      const items = Array.from({ length: maxIndex + 1 }).map(() => ({ heading: '', body: '' }));
      fields.forEach(f => {
        const i = parseInt(f.getAttribute('data-i')); const k = f.getAttribute('data-field'); items[i][k] = f.value;
      });
      const filtered = items.filter(x => x.heading || x.body);
      await API.updateBlocks(filtered);
      toast('Zapisano bloki');
    } catch (e) { toast(e.message || 'Błąd zapisu bloków', false); }
  });

  // Quick upload for blocks – uploads and inserts URL to focused block image field
  $('blockUploadBtn')?.addEventListener('click', async () => {
    try {
      const file = $('blockUpload').files[0];
      if (!file) { toast('Wybierz plik', false); return; }
      const up = await API.upload(file);
      const focused = document.activeElement;
      const target = (focused && focused.matches('input[data-kind="blocks"][data-field="image"]')) ? focused : document.querySelector('input[data-kind="blocks"][data-field="image"]');
      if (up?.success && up.file?.url && target) target.value = up.file.url;
      toast('Dodano zdjęcie');
    } catch (e) { toast(e.message || 'Błąd uploadu', false); }
  });

  $('saveHero').addEventListener('click', async () => {
    try {
      const payload = {
        title: $('heroTitle').value,
        subtitle: $('heroSubtitle').value,
        ctaClient: { label: $('ctaClientLabel').value, href: $('ctaClientHref').value },
        ctaTech: { label: $('ctaTechLabel').value, href: $('ctaTechHref').value },
        colors: { primary: $('colorPrimary').value, accent: $('colorAccent').value },
        marqueeText: $('marqueeText').value
      };
      const file = $('bannerFile').files[0];
      if (file) {
        const up = await API.upload(file);
        if (up?.success && up.file?.url) payload.bannerImage = up.file.url;
      }
      await API.updateHero(payload);
      toast('Zapisano HERO');
    } catch (e) { toast(e.message || 'Błąd zapisu HERO', false); }
  });

  $('saveServices').addEventListener('click', async () => {
    try {
      const fields = Array.from(document.querySelectorAll('#services [data-field]'));
      const maxIndex = Math.max(0, ...fields.map(f => parseInt(f.getAttribute('data-i')||'0')));
      const items = Array.from({ length: maxIndex + 1 }).map(() => ({ icon: '', title: '', description: '', href: '' }));
      fields.forEach(f => {
        const i = parseInt(f.getAttribute('data-i'));
        const k = f.getAttribute('data-field');
        items[i][k] = f.value;
      });
      const filtered = items.filter(x => x.title || x.description || x.href);
      await API.updateServices(filtered);
      toast('Zapisano usługi');
    } catch (e) { toast(e.message || 'Błąd zapisu usług', false); }
  });

  // Init
  (function init() {
    const saved = localStorage.getItem('cmsKey');
    if (saved) $('adminKey').value = saved;
    // Gating: ukryj sekcje do czasu zalogowania
    (async () => {
      let isAdmin = false;
      try { const me = await fetch('/api/cms/me').then(r=>r.json()).catch(()=>({})); isAdmin = !!me.isAdmin; } catch(_) {}
      const sections = Array.from(document.querySelectorAll('section'));
      if (!isAdmin) {
        // Pokaż tylko nagłówek (z loginem)
        sections.forEach(s => { s.style.display = 'none'; });
      } else {
        sections.forEach(s => { s.style.display = ''; });
        load();
        loadGallery();
        populatePagesSelect();
      }
    })();
  })();
})();



