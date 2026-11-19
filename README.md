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

## Estructura

```
index.html            página base (manifest, theme-color, metas de instalación)
public/               manifest, íconos y favicon
src/App.tsx           navegación: direcciones y pantallas con y sin sesión
src/pantallas/        una pantalla por archivo (Equipos, Alertas, Historicos, Perfil, Login, ...)
src/componentes/      modal de avisos, barra de pestañas, encabezado, botones, campos
src/lib/              API, servicios, lógica (estado de equipos, validaciones, gráficos) y sus tests
nginx/, docker-compose.yml, init-ssl.sh   servidor (nginx + certbot) en el VPS
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
