# Centinela — progreso, decisiones y pendientes

Primer commit: 2026-03-20 (app Expo / React Native para Android). Web desde 2026-09-21; reescrita con Vite + React +
TypeScript el 2026-11-19.

## Estado (al 2026-11-21)

- **Pantallas** (`src/pantallas/`): Equipos (estado, ordenados por urgencia, resumen), Detalle de equipo (gráfico SVG
  propio), Configurar equipo (rangos de temperatura con ±), Agregar equipo, Alertas, Históricos (reporte PDF),
  Perfil, Login, Registro y Verificar email. Enlaces directos a `/equipo/:id` funcionan; sin sesión van al login y
  vuelven al equipo.
- **Sesión**: tokens de la API de Telemet en `localStorage`, renovación automática (`src/lib/api.ts`).
- **Interfaz**: dos temas automáticos, oscuro "Grafito" y claro "Clara", con selector Claro / Auto / Oscuro en el
  Perfil y en el encabezado de Equipos solo en la computadora (en el celular, solo en Perfil); íconos SVG; "Act.
  HH:MM" en equipos y alertas, con "Actualizar" solo en la computadora; aviso de versión nueva; tirar para
  actualizar en la app instalada (componente común, 2026-11-27).
- **Reportes PDF**: por el diálogo de impresión del navegador, siempre claros, A4, con HTML escapado.
- **Servidor**: según ESTANDARES A1-A9 por `deploy/servidor.sh` en cada deploy (2026-11-20); SSL con renovación
  probada una vez por semana (C1); cabeceras con CSP (C2); verificación en el dominio después de cada deploy (B7);
  Dependabot y `npm audit` (B8).
- **Vigilancia**: sin monitor local (no hay API ni clave de email en este servidor); el monitor del Mayorista mira la
  página cada 5 minutos y el certificado a diario, y avisa por email al cambiar de estado.
- **Backups**: no hacen falta: no hay base ni datos propios (el repo y el certificado se rehacen con el deploy e
  `init-ssl.sh`).
- Qué estándares aplican y cuáles no, con el motivo: sección "Estándares comunes" del `README.md`.

## Decisiones

- **2026-09-18/21 — De app Android a webapp** (pedido de Eric): se borró la distribución Android y las
  notificaciones push; no conviven. Hoy es regla para todos los proyectos (ESTANDARES H1: solo web).
- **2026-09-21 — Sin acceso al backend de Telemet**: la sesión queda en `localStorage` (deuda de seguridad aceptada,
  no se puede pasar a cookies httpOnly sin cambiar la API) y el PDF se arma en el navegador, sin librerías.
- **2026-09-21 — `init-ssl.sh` con `--entrypoint certbot`**: el servicio certbot del compose tiene un entrypoint
  propio (el loop de renovación) que ignoraba `certonly`.
- **2026-11-19 — Vite + React + TypeScript, sin Expo ni React Native** (decisión de Eric): el JS bajó de 1,37 MB
  (455 KB gzip) a ~408 KB (126 KB gzip). Se portaron los estilos 1:1 y se compararon capturas antes y después
  píxel por píxel. De paso se arreglaron: eliminar equipo (llamaba a una función que no existía), el enlace "Ya tengo
  cuenta" negro sobre negro y los encabezados de registro.
- **2026-11-19 — Rediseño con dos temas automáticos**, colores solo por variables CSS. Centinela quedó como
  referencia de ESTANDARES G1 a G4 para todos los proyectos.
- **2026-11-19 — Reporte PDF reescrito**: HTML escapado (un nombre de equipo con `<script>` se ejecutaba en la pestaña
  del reporte, con acceso al token), pestaña abierta en el mismo toque (Safari la bloqueaba) y sin scripts en el HTML
  del reporte (CSP).
- **2026-11-19 — nginx**: se monta la carpeta `nginx/` (con un archivo suelto, después de `git reset` el contenedor
  seguía viendo el viejo) y las cabeceras van en un snippet incluido en cada `location`.
- **2026-11-20 — Clave de deploy propia** (ESTANDARES A4, con autorización de Eric): `VPS_SSH_KEY` con la clave de
  Centinela; se sacaron del servidor las claves compartidas viejas. Quedan la de acceso de Eric y la del deploy.
- **2026-11-21 — La marca del panel de anuncios es AltoqueAds** (pedido de Eric; antes se escribía con "k"): solo cambian
  dos comentarios, Centinela no manda eventos al panel.

- **2026-11-21 — Ayudas de pantalla que se pueden ocultar** (pedido de Eric, "todas de una vez"): los dos recuadros de
  ayuda (Agregar equipo e Históricos) usan el componente único `src/componentes/Ayuda.tsx`; su X ("Ocultar las
  ayudas", 44 px) oculta todas al instante y Perfil → Ayudas → "Mostrar las ayudas de cada pantalla" las vuelve a
  mostrar. Estado compartido en `src/lib/ayudas.ts`. Se guarda **en el dispositivo** (clave
  `centinela_ayudas_ocultas`), no en la cuenta: la API de Telemet no guarda preferencias y no hay base propia (igual
  que el tema). Si falla el guardado, vuelven y se avisa. Toda ayuda nueva va con `<Ayuda>`.

- **2026-11-27 — Celular sin botón Actualizar ni selector de tema en el inicio** (pedido de Eric, ESTANDARES D6 y G1):
  en pantallas de hasta 639 px (criterio único, clase `tpa-oculto-celular`) Equipos ya no muestra Actualizar ni el
  tema (queda en Perfil) y Alertas no muestra Actualizar; la hora "Act. HH:MM" y el refresco de cada minuto siguen.
  El "tirar para refrescar" propio (`TirarParaRefrescar.tsx`, andaba en cualquier pantalla táctil) se reemplazó por
  el componente común `src/componentes/TirarParaActualizar.tsx` (+ `tirarParaActualizarEstado.ts` y `.css`, copia de
  `Proyectos/plantillas/tirar-para-actualizar/`), montado una vez en `main.tsx`: solo en la app instalada
  (standalone) y táctil, desde arriba de todo, sin modal abierto. Recarga los datos de la pestaña visible
  (`RecargaDePantalla.tsx`: Equipos y Alertas, que quedan montadas ocultas) o, si no hay, la página. En el navegador
  del celular queda el gesto nativo.

## Pendientes conocidos

- Ayudas ocultas y tema valen por dispositivo: pasarían a la cuenta solo si Telemet agrega preferencias a su API.

- En `/opt/centinela/dist` quedan archivos viejos de Expo (`_expo/`, `assets/node_modules`) porque el scp no borra:
  inofensivos.
- Sesión en `localStorage`: depende de que Telemet ofrezca cookies httpOnly en su API.
- De Eric: borrar en expo.dev el proyecto EAS huérfano ("Centinela") que quedó de la migración (no tiene costo).
