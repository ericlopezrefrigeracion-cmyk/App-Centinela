#!/bin/bash
# Script de inicialización SSL — ejecutar UNA SOLA VEZ en el VPS, después del primer
# `docker compose up -d` (con el dist/ ya subido al menos una vez, aunque sea vacío).
# Uso: bash init-ssl.sh tu@email.com
set -e

EMAIL=${1:-"admin@telemet.com.ar"}
DOMAIN="clientes.telemet.com.ar"

echo "→ Obteniendo certificado SSL para $DOMAIN..."

docker compose stop nginx 2>/dev/null || true

docker compose run --rm --publish 80:80 --no-deps certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --no-eff-email \
  --email "$EMAIL" \
  -d "$DOMAIN"

echo "✓ Certificado obtenido correctamente"
echo "→ Levantando nginx con SSL..."

docker compose up -d nginx certbot

echo ""
echo "✓ SSL configurado. El sitio está disponible en https://$DOMAIN"
echo "  La renovación automática corre cada 12 horas vía el servicio certbot."
