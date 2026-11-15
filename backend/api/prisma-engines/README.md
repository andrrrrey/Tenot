# Локальная копия движков Prisma (необязательно)

Сборка Docker-образа API берёт движки Prisma отсюда, если файлы лежат в этой папке
и их sha256 совпадает с ожидаемым (см. `Dockerfile`). Иначе — скачивает с
binaries.prisma.sh с таймаутами и повторами.

Файлы в git не хранятся (`.gitignore`). Достать их из работающего контейнера:

```sh
cd /opt/tenot/backend/api
docker cp tenot-api:/app/node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x prisma-engines/
docker cp tenot-api:/app/node_modules/@prisma/engines/libquery_engine-debian-openssl-3.0.x.so.node prisma-engines/
```
