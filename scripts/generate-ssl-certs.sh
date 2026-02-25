#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSL_DIR="$ROOT_DIR/ssl"

mkdir -p "$SSL_DIR"

CERT_FILE="$SSL_DIR/fullchain.pem"
KEY_FILE="$SSL_DIR/privkey.pem"

openssl req -x509 -nodes -newkey rsa:4096 -sha256 -days 825 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -subj "/C=US/ST=State/L=City/O=SafeNode/OU=Security/CN=safe-node.app" \
  -addext "subjectAltName=DNS:safe-node.app,DNS:www.safe-node.app,DNS:localhost,IP:127.0.0.1"

chmod 600 "$KEY_FILE"

echo "Generated:"
echo "  $CERT_FILE"
echo "  $KEY_FILE"
echo
echo "Use these files in nginx/docker-compose for local TLS termination."
