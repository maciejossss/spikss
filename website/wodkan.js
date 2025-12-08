(function(){
  function sanitize(s){ return String(s||'').toString().trim(); }
  async function submitInquiry(e){
    e.preventDefault();
    const f = e.target;
    const info = document.getElementById('inqInfo');
    info.textContent = '';
    const payload = {
      serviceType: 'wodkan_inquiry',
      contactName: sanitize(f.name.value),
      phone: sanitize(f.phone.value),
      email: sanitize(f.email.value),
      description: sanitize(f.message.value),
      address: null,
      city: null,
      preferredDate: null,
      preferredTime: null,
      isUrgent: false
    };
    if (!payload.contactName || !payload.phone || !payload.email || !f.rodo.checked || !payload.description){
      info.textContent = 'Uzupełnij wszystkie pola i wyraź zgodę.'; return;
    }
    try {
      const r = await fetch('/api/service-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok || !j.success) throw new Error('Błąd wysyłki');
      info.textContent = 'Wiadomość wysłana. Numer referencyjny: ' + (j.referenceNumber || '—');
      f.reset();
    } catch (e) {
      info.textContent = 'Nie udało się wysłać zapytania. Spróbuj później.';
    }
  }
  document.addEventListener('DOMContentLoaded', function(){
    const form = document.getElementById('inqForm');
    if (form) form.addEventListener('submit', submitInquiry);

    // Prosta karuzela: wczytaj listę zdjęć z uploads/ (użyj kilku nazw przykładowych jeśli brak)
    const gallery = document.getElementById('gallery');
    const gimg = document.getElementById('gimg');
    const ginfo = document.getElementById('ginfo');
    if (gallery && gimg) {
      // Jeśli podstrona ma własną galerię (data-slug), pozostaw obsługę dla page-gallery.js
      if (gallery.dataset && gallery.dataset.slug) {
        return;
      }
      const images = [
        '/uploads/realizacja1.jpg',
        '/uploads/realizacja2.jpg',
        '/uploads/realizacja3.jpg'
      ];
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
    }
  });
})();
