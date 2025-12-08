// 🌍 Konfiguracja API dla aplikacji mobilnej – autodetekcja + możliwość nadpisania
(function () {
  const getExplicitOverride = () => {
    try {
      if (typeof window.__SERWIS_API_BASE__ === 'string' && window.__SERWIS_API_BASE__.trim()) {
        return window.__SERWIS_API_BASE__.trim();
      }
      const meta = document.querySelector('meta[name="serwis-api-base"]');
      if (meta && typeof meta.content === 'string' && meta.content.trim()) {
        return meta.content.trim();
      }
      if (typeof window.SERWIS_API_BASE === 'string' && window.SERWIS_API_BASE.trim()) {
        return window.SERWIS_API_BASE.trim();
      }
    } catch (_) {
      // cichy fallback
    }
    return null;
  };

  const normalizeOrigin = () => {
    try {
      const origin = window.location.origin;
      if (origin && origin !== 'null') return origin;
      // Fallback dla schematów file:// lub innych nietypowych
      const { protocol, hostname, port } = window.location;
      if (protocol && hostname) {
        return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
      }
    } catch (_) {
      // ignoruj – dalej spróbujemy innych heurystyk
    }
    return null;
  };

  const detectBaseUrl = () => {
    const explicit = getExplicitOverride();
    if (explicit) return explicit;

    try {
      const { hostname, port, protocol } = window.location;
      // Typowy przypadek dev: PWA na Vite (5173), API na 5174
      if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '5173') {
        return `${protocol}//${hostname}:5174`;
      }
      // Jeżeli PWA działa z pakietu desktopowego (Electron) – backend nasłuchuje na tym samym porcie
      if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '5174') {
        return `${protocol}//${hostname}:5174`;
      }
      // Domyślnie: użyj bieżącego originu
      const origin = normalizeOrigin();
      if (origin) return origin;
    } catch (_) {
      // cichy fallback
    }

    // Ostateczny fallback – zakłada lokalny backend
    return 'http://localhost:5174';
  };

  const baseUrl = detectBaseUrl();
  window.__SERWIS_API_BASE__ = baseUrl;

  const withBase = (suffix) => `${baseUrl}${suffix.startsWith('/') ? '' : '/'}${suffix}`;

  const API_CONFIG = {
    baseUrl,
    technicians: withBase('/api/technicians'),
    orders: (userId) => withBase(`/api/desktop/orders/${userId}`),
    updateOrder: (orderId) => withBase(`/api/desktop/orders/${orderId}/status`),
    health: withBase('/api/health'),
    desktop: 'http://localhost:5174',
    environment: (() => {
      try {
        if (baseUrl.includes('railway.app')) return 'railway';
        const host = window.location.hostname;
        return (host === 'localhost' || host === '127.0.0.1') ? 'localhost' : 'custom';
      } catch (_) {
        return 'custom';
      }
    })()
  };

  window.API_CONFIG = API_CONFIG;

  try {
    console.log('🌍 Environment Detection:');
    console.log(`   Host: ${window.location.hostname}`);
    console.log(`   Port: ${window.location.port}`);
    console.log(`   Resolved API base: ${baseUrl}`);
    console.log(`   Environment: ${API_CONFIG.environment}`);
    console.log('📍 Kluczowe endpointy:', {
      technicians: API_CONFIG.technicians,
      health: API_CONFIG.health
    });
  } catch (_) {
    // brak konsoli – pomiń
  }
})(); 