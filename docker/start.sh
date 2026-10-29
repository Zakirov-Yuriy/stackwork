#!/bin/sh
# Применяем миграции и запускаем сервер.
set -e
./node_modules/.bin/prisma migrate deploy
exec node server.js
