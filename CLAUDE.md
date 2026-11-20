# Centinela (App-Centinela) — instrucciones permanentes para Claude Code

Este archivo se carga en cada sesión. Leelo siempre antes de trabajar, también después de una compactación.

Webapp (PWA) para que los clientes de Telemet monitoreen la temperatura de sus equipos de frío: equipos con su
estado, detalle con gráfico, configuración de rangos, alertas, históricos con reporte PDF y perfil. **No tiene
backend ni base propios**: consume la API externa `https://api.telemet.com.ar` (de Telemet, fuera de este repo y de
este servidor; no se puede cambiar desde acá). No es parte de ClimaDesk: otro negocio, otro servidor.

## Dónde vive

- Producción directa (no hay staging): `https://clientes.telemet.com.ar`, VPS DigitalOcean 137.184.10.166 (512 MB +
  2 GB de swap), carpeta `/opt/centinela`. Clave de acceso `~/.ssh/acceso_centinela` (usuario root, siempre con
  `-o IdentitiesOnly=yes`); el deploy usa su propia clave (secreto `VPS_SSH_KEY`).
- En el servidor solo hay nginx (sirve `dist/` y las cabeceras de `nginx/cabeceras.conf`) y certbot (renueva por
  webroot cada 12 h). El DNS de `telemet.com.ar` está en Cloudflare: `clientes` va en "DNS only" (con el proxy
  naranja falla la validación de Let's Encrypt).
- Stack: Vite + React 19 + TypeScript + react-router, axios, Vitest y oxlint. Repo público
  `ericlopezrefrigeracion-cmyk/App-Centinela` (el VPS lo clona por HTTPS sin credenciales).

## Deploy

Push a `main` → `.github/workflows/deploy.yml`: `npm audit --omit=dev`, tipos, lint, tests y build en el runner; por
SSH, `git reset` en `/opt/centinela`, `deploy/servidor.sh` (estándar A), `nginx -t` con vuelta atrás, `docker compose
up -d` y recarga de nginx, prueba semanal de renovación del SSL; scp de `dist/` y verificación en el dominio (versión
nueva, ruta profunda, robots, noindex y cabeceras). Todo push dispara el deploy (también los de documentación). Los
deploys hacen fila (nunca se cancelan); se puede correr a mano (`workflow_dispatch`).

## Fuentes de verdad

1. `docs/PROGRESO.md`: estado, decisiones con fecha y pendientes. Actualizalo al terminar cada cambio.
2. `README.md`: tecnología, estructura, comandos y qué estándares aplican y cuáles no (sin backend propio).
3. `../ESTANDARES.md` (carpeta de proyectos): estándares comunes. Centinela es la referencia de G1 a G4 (interfaz e
   impresión); toda mejora que valga para los demás se anota ahí.

## Reglas que no se negocian

- **Secretos**: nunca pedirlos, mostrarlos, loguearlos ni commitearlos (el repo es público). La sesión del usuario la
  da la API de Telemet; no hay secretos propios en el servidor.
- **La API es de Telemet**: no tenemos acceso a `api.telemet.com.ar`; si algo necesita un cambio ahí, se reporta.
  Por eso la sesión va en `localStorage` (deuda aceptada) y el PDF se arma en el navegador.
- **Colores solo por variables CSS** (`src/estilos.css`, expuestas como `C.*` en `src/lib/tema.ts`): nunca un hex
  suelto ni concatenar alfa a un color (`col + '22'` rompe con `var(--…)`); para fondos suaves están los tokens
  `*Fondo`. Tema por defecto Auto, con selector Claro / Auto / Oscuro guardado en el dispositivo.
- **Íconos SVG** de `src/componentes/iconos.tsx`, nunca emojis (lo vigila `src/lib/guardian.test.ts`).
- **Fechas, horas y números solo por `src/lib/formato.ts`**: hora de Buenos Aires, 24 h, coma decimal y signo menos
  (lo vigila el guardián).
- **Reportes PDF** (`src/lib/reportes.ts`): siempre claros, A4, HTML escapado (un nombre de equipo con `<script>`
  llegó a ejecutarse) y sin `<script>` ni `onclick` en el HTML del reporte (hereda la CSP); la pestaña se abre en el
  mismo toque, antes de cualquier `await` (Safari la bloquea si no).
- **Campos de temperatura**: `inputMode="decimal"` + botón ±, coma a punto; nunca `type="number"`.
- **App privada**: `noindex` en meta, cabecera y `robots.txt`. Cabeceras de seguridad (CSP incluida) en
  `nginx/cabeceras.conf`, incluido en cada `location`.
- Comentarios de código y textos en castellano rioplatense.

## Forma de trabajo

- Commit y push a `main` al terminar cada cambio (mensaje en español). Antes de pushear, `gh run list -L 1`: nunca
  encima de un deploy en curso. Seguir el deploy hasta que termine en verde.
- Tests (Vitest) para todo lo nuevo, con valores esperados calculados aparte. Corren en CI, no en local;
  `npm run typecheck` sí, localmente, antes de commitear. No testear el texto exacto de fechas formateadas (Node y
  Chrome difieren).
- Nada a mano en el servidor: todo va en el repo (`deploy/servidor.sh`, `docker-compose.yml`, `nginx/`).
- Solo detenerse si falta algo que únicamente Eric puede dar (un secreto, un login), y seguir con todo lo demás.
