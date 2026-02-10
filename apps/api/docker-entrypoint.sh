#!/bin/sh
set -e

echo "[api] Aplicando migrações Prisma..."
npx prisma migrate deploy

echo "[api] Iniciando aplicação NestJS..."
exec node dist/main.js
