// Tema elegido (Claro / Oscuro) antes de que pinte la app, para que no parpadee (ESTANDARES G1).
// Va como archivo propio y sin defer en el <head>, después de las <meta name="theme-color">, porque
// la CSP no permite scripts en línea. Hace lo mismo que aplicarEnDocumento() de
// src/lib/temaNavegador.ts; con Auto (o sin nada guardado) no toca nada y manda el sistema.
(function () {
  var preferencia;
  try {
    preferencia = localStorage.getItem('tema');
  } catch (e) {
    return;
  }
  if (preferencia !== 'claro' && preferencia !== 'oscuro') return;
  var atributo = preferencia === 'oscuro' ? 'dark' : 'light';
  var raiz = document.documentElement;
  raiz.setAttribute('data-theme', atributo);
  raiz.style.colorScheme = atributo;
  var esquema = document.querySelector('meta[name="color-scheme"]');
  if (esquema) esquema.setAttribute('content', atributo);
  var metas = document.querySelectorAll('meta[name="theme-color"]');
  var color = null;
  var i;
  for (i = 0; i < metas.length; i++) {
    if (metas[i].getAttribute('data-original') === null) metas[i].setAttribute('data-original', metas[i].getAttribute('content') || '');
    if ((metas[i].getAttribute('media') || '').indexOf(atributo) !== -1) color = metas[i].getAttribute('data-original');
  }
  if (color === null) return;
  for (i = 0; i < metas.length; i++) metas[i].setAttribute('content', color);
})();
