/* Lightweight stub to ensure Vue is available if CDN is blocked by CSP.
   Prefer CDN; this fallback should be replaced with the proper Vue build if needed. */
(function(){
  if (window.Vue) return;
  console.error('Vue CDN blocked; local fallback is not implemented.');
})();


