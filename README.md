# Centinela

Aplicación web (PWA) para que los clientes de Telemet monitoreen la temperatura de sus equipos de frío.
Producción: https://clientes.telemet.com.ar

## Tecnología

- **Vite + React 19 + TypeScript**, con React Router.
- Axios contra la API externa `https://api.telemet.com.ar` (no es parte de este repo).
- Sin base de datos propia: la sesión se guarda en `localStorage` (`centinela_token`,
  `centinela_refresh_token`, `centinela_usuario`) y el token se renueva solo (`src/lib/api.ts`).
- Gráficos en SVG propio; reportes PDF con el diálogo de impresión del navegador (`src/lib/reportes.ts`).
- Se instala como app: `public/manifest.json`, íconos y metas de Apple en `index.html`. No hay service worker.
- **Dos temas automáticos** según el modo del teléfono o la computadora (`prefers-color-scheme`):
  oscuro "Grafito" y claro "Clara". Los colores son variables CSS en `src/estilos.css`; `src/lib/tema.ts`
  las expone como `C.*` (`var(--c-…)`) para los estilos en línea, así el cambio es en vivo. Tipografía Inter.
- Íconos SVG de trazo en `src/componentes/iconos.tsx` (nada de emojis; lo vigila `src/lib/guardian.test.ts`).
- Fechas, horas y números solo por `src/lib/formato.ts`: hora de Buenos Aires, 24 h, coma decimal y signo menos.
- Reportes PDF siempre claros, en A4 (`src/lib/reportes.ts`).
- App privada: `noindex` (meta, cabecera `X-Robots-Tag` y `robots.txt` con `Disallow: /`).

## Estructura

```
index.html            página base (manifest, theme-color, metas de instalación)
public/               manifest, íconos y favicon
src/App.tsx           navegación: direcciones y pantallas con y sin sesión
src/pantallas/        una pantalla por archivo (Equipos, Alertas, Historicos, Perfil, Login, ...)
src/componentes/      modal de avisos, barra de pestañas, encabezado, botones, campos
src/lib/              API, servicios, lógica (estado de equipos, validaciones, gráficos) y sus tests
nginx/, docker-compose.yml, init-ssl.sh   servidor (nginx + certbot) en el VPS; cabeceras en nginx/cabeceras.conf
```

Direcciones: `/`, `/alertas`, `/historicos`, `/perfil`, `/login`, `/registro`, `/verificar-email`,
`/equipo/agregar`, `/equipo/:id` y `/equipo/configurar/:id`. nginx devuelve `index.html` para todas.

## Comandos

```bash
npm install
npm run dev        # servidor local (http://localhost:5173)
npm run typecheck  # tsc
npm run lint       # oxlint
npm test           # Vitest (lo corre GitHub Actions en cada push y PR)
npm run build      # genera dist/
```

## Publicación

Cada push a `main` corre `.github/workflows/deploy.yml`: instala, revisa tipos, lint, tests, arma `dist/`,
lo sube al VPS (`/opt/centinela/dist`, servido por nginx) y verifica que el dominio sirva la versión nueva.
Los PR (por ejemplo los de Dependabot) corren las mismas verificaciones sin desplegar.

## Estándares comunes (`Proyectos/ESTANDARES.md`)

Cumple los que corresponden a una web de clientes sin backend: B4 (los deploys hacen fila), B6 (`nginx -t` antes
de usar la configuración nueva y vuelta atrás si falla), B7 (verificación en el dominio: versión, robots, noindex y
cabeceras), B8 (Dependabot + `npm audit --omit=dev`), C2 (cabeceras de seguridad con CSP, en un snippet incluido en
cada `location`), D6 (equipos y alertas con "Act. HH:MM" y "Actualizar"), D7 (aviso de versión nueva), E7 en lo que
toca al navegador (formatos solo en `formato.ts`, con test guardián) y G1 a G4 (temas, íconos, reportes PDF y campos
con ±).

No aplican, porque no hay backend ni base propios (la API es `api.telemet.com.ar`, de Telemet): A9 en la parte de
Postgres, B1-B3 y B5 (no hay imagen propia, tests de base ni migraciones), C3-C7 (archivos, webhooks, sesiones del
servidor, secretos y logs viven en la API), D1-D5, D8 y D9 (no hay panel de staff), E1-E6, E8, E9 y F (sin backend ni
medición). Pendiente: A1-A8 del servidor en un `deploy/servidor.sh` y una clave de acceso propia del VPS (A4).
