#!/bin/sh

USER="$1"
BASE="/etc/google-auth"
FILE="$BASE/$USER"

mkdir -p "$BASE"

# Si ya existe, no regenerar
[ -f "$FILE" ] && exit 0

# Generar el secreto sin QR
google-authenticator \
  -t -d -f -r 3 -R 30 -W -q -C \
  -l "$USER@OpenVPN" \
  -s "$FILE"
