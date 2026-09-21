// expo export -p web con web.output "single" no pasa por app/+html.tsx (esa customización
// solo se usa en modo "static") -- así que el manifest de PWA y los meta tags de instalación
// se inyectan acá, parcheando el index.html ya generado. Mismo patrón que apps/tecnicos en
// Web-Gestion-Taller.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(file, 'utf8');

const before = html;

html = html.replace('<html lang="en">', '<html lang="es">');
html = html.replace(
  '<link rel="icon" href="/favicon.ico" /></head>',
  [
    '<link rel="icon" href="/favicon.ico" />',
    '<link rel="manifest" href="/manifest.json" />',
    '<meta name="theme-color" content="#7ed321" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
    '<meta name="apple-mobile-web-app-title" content="Centinela" />',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
    '</head>',
  ].join('\n    '),
);

if (html === before) {
  console.error('inject-pwa-html: no se encontró el marcador esperado en index.html -- revisar si Expo cambió el template.');
  process.exit(1);
}

fs.writeFileSync(file, html);
console.log('PWA: manifest y meta tags inyectados en dist/index.html');
