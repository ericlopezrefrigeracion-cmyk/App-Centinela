#!/usr/bin/env bash
# Copia del de Web-AltoqueAds (el mismo en los proyectos): lo propio de Centinela es el nombre de 52centinela-reinicio
# y que no hay base ni API (A9 en la parte de Postgres no aplica).
# Configuración del servidor (ESTANDARES.md, sección A). La corre el deploy en cada push a main: es
# idempotente (escribe cada archivo solo si cambió y recarga solo lo que cambió), así un servidor nuevo
# queda igual que el actual con solo correr el deploy. Nada de esto se hace a mano en el VPS.
#
#   A1 ufw: entrada denegada salvo 22/80/443 (Docker solo publica el 80 y el 443 de nginx; no hay otros puertos).
#   A2 fail2ban: jail sshd, 5 intentos, 1 hora.
#   A3 SSH sin contraseña; root solo con clave. Se valida con "sshd -t" antes de recargar (recargar no
#      corta las sesiones abiertas: si la validación falla, se vuelve al archivo anterior).
#   A5 swap de 2 GB, swappiness 10.
#   A6 journal: 300 MB y 3 meses como máximo.
#   A7 Docker: logs json-file de 10 MB × 3 y limpieza semanal (domingo 04:30).
#   A8 unattended-upgrades con reinicio automático a las 04:30 si hace falta.
#   A9 zona horaria de Buenos Aires en el host.
# A4 (claves SSH) y A10 (reemplazo de servidores) no son configuración: ver ESTANDARES.md.
# Lo corre el deploy (.github/workflows/deploy.yml) con "bash deploy/servidor.sh" después de actualizar el repo.
set -euo pipefail

ZONA=America/Argentina/Buenos_Aires
CAMBIOS=()

# Escribe un archivo solo si su contenido cambió. Devuelve 0 si lo cambió, 1 si ya estaba igual.
escribir() {
  local destino="$1" modo="${2:-644}" nuevo
  nuevo=$(cat)
  if [ -f "$destino" ] && [ "$(cat "$destino")" = "$nuevo" ]; then return 1; fi
  mkdir -p "$(dirname "$destino")"
  printf '%s\n' "$nuevo" > "$destino.nuevo"
  chmod "$modo" "$destino.nuevo"
  mv "$destino.nuevo" "$destino"
  CAMBIOS+=("$destino")
  return 0
}

instalar_paquetes() {
  local faltan=()
  for p in "$@"; do dpkg -s "$p" >/dev/null 2>&1 || faltan+=("$p"); done
  if [ "${#faltan[@]}" -gt 0 ]; then
    echo "Instalando: ${faltan[*]}"
    # Espera hasta 5 minutos si unattended-upgrades tiene tomado apt.
    apt-get -o DPkg::Lock::Timeout=300 update -qq
    DEBIAN_FRONTEND=noninteractive apt-get -o DPkg::Lock::Timeout=300 install -y -qq "${faltan[@]}" >/dev/null
  fi
}

instalar_paquetes ufw fail2ban unattended-upgrades

# A9: hora del host (los cron usan además CRON_TZ).
if [ "$(timedatectl show -p Timezone --value 2>/dev/null)" != "$ZONA" ]; then
  timedatectl set-timezone "$ZONA"
  CAMBIOS+=("zona horaria")
fi

# A1: firewall. Las reglas se agregan antes de habilitarlo: nunca queda bloqueado el 22.
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
if ! ufw status | grep -q '^Status: active'; then ufw --force enable >/dev/null; CAMBIOS+=("ufw"); fi

# A2: fail2ban. Backend systemd (Ubuntu 24.04 ya no garantiza /var/log/auth.log).
if escribir /etc/fail2ban/jail.d/estandar.local <<'EOF'
# Estándar de los proyectos (deploy/servidor.sh): 5 intentos fallidos de SSH = 1 hora afuera.
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF
then systemctl restart fail2ban; fi
systemctl enable --now fail2ban >/dev/null 2>&1
systemctl is-active --quiet fail2ban || { echo "ATENCIÓN: fail2ban no arrancó" >&2; journalctl -u fail2ban -n 20 --no-pager >&2; exit 1; }

# A3: SSH. 00- para que gane sobre 50-cloud-init.conf (sshd usa el primer valor que encuentra).
CONF_SSH=/etc/ssh/sshd_config.d/00-estandar.conf
ANTERIOR_SSH=$(cat "$CONF_SSH" 2>/dev/null || true)
if escribir "$CONF_SSH" <<'EOF'
# Estándar de los proyectos (deploy/servidor.sh): solo claves; root entra únicamente con clave.
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
then
  if sshd -t; then
    # Ubuntu 24.04 arranca sshd por socket: si no está corriendo, toma el archivo al próximo inicio.
    systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
  else
    echo "ATENCIÓN: la configuración de SSH no pasa sshd -t; vuelve la anterior" >&2
    if [ -n "$ANTERIOR_SSH" ]; then printf '%s\n' "$ANTERIOR_SSH" > "$CONF_SSH"; else rm -f "$CONF_SSH"; fi
    exit 1
  fi
fi

# A5: swap de 2 GB.
if ! swapon --show=NAME --noheadings | grep -q '^/swapfile$'; then
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
  fi
  swapon /swapfile
  CAMBIOS+=("swap")
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
if escribir /etc/sysctl.d/99-swappiness.conf <<'EOF'
vm.swappiness=10
EOF
then sysctl -q -p /etc/sysctl.d/99-swappiness.conf; fi

# A6: journal.
if escribir /etc/systemd/journald.conf.d/limite.conf <<'EOF'
# Estándar de los proyectos (deploy/servidor.sh): el journal no pasa de 300 MB ni guarda más de 3 meses.
[Journal]
SystemMaxUse=300M
MaxRetentionSec=3month
EOF
then systemctl restart systemd-journald; fi

# A7: Docker. daemon.json vale para los contenedores que se crean después de reiniciar Docker: este
# script NO reinicia Docker (cortaría el sitio). Se aplica solo en el
# próximo reinicio del servidor (A8, 04:30); mientras tanto docker-compose.yml fija los mismos límites
# en cada contenedor, que valen desde este mismo deploy.
if escribir /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
then echo "daemon.json de Docker actualizado: rige desde el próximo reinicio del servidor"; fi
escribir /etc/cron.d/docker-limpieza <<'EOF' || true
# Estándar de los proyectos (deploy/servidor.sh): limpieza semanal de Docker (imágenes huérfanas y caché de compilación de más de 7 días). Las imágenes en uso no se tocan.
CRON_TZ=America/Argentina/Buenos_Aires
30 4 * * 0 root docker image prune -f >/dev/null 2>&1; docker builder prune -af --filter until=168h >/dev/null 2>&1
EOF

# A8: actualizaciones automáticas con reinicio a las 04:30 (hora del host = Buenos Aires) si hace falta.
# Los contenedores vuelven solos (restart: unless-stopped).
escribir /etc/apt/apt.conf.d/20auto-upgrades <<'EOF' || true
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
escribir /etc/apt/apt.conf.d/52centinela-reinicio <<'EOF' || true
// Estándar de los proyectos (deploy/servidor.sh): si una actualización pide reiniciar, a las 04:30.
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-WithUsers "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF
systemctl enable --now unattended-upgrades >/dev/null 2>&1 || true

if [ "${#CAMBIOS[@]}" -gt 0 ]; then echo "Servidor: cambió ${CAMBIOS[*]}"; else echo "Servidor: todo en orden"; fi
