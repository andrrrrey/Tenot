# Deploy (Production) — tenot.ru / tenor.ru

This repo contains:
- **frontend/** Next.js (App Router) with **production-grade auth** (httpOnly cookies) + proxy to backend
- **backend/api/** NestJS + Prisma + PostgreSQL
- **infra/nginx/** Nginx reverse proxy + SSL + optional basic-auth for /admin
- **docker-compose.yml** to run everything on a VPS

## 0) Requirements on VPS (Ubuntu)

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
# re-login to SSH so group changes apply
```

## 1) Put project on the server

Upload the folder to e.g.:

```bash
/home/ubuntu/tenot-full
```

## 2) Configure env

Edit `.env` (root):

```env
JWT_SECRET=CHANGE_ME_LONG_RANDOM
```

## 3) Start services

```bash
docker compose up -d --build
```

Run DB migrations:

```bash
docker compose exec api sh -lc "npx prisma migrate deploy"
```

## 4) Domain DNS

Point A-record to your VPS IP:
- tenot.ru
- (optional) tenor.ru

Wait for DNS to propagate.

## 5) Get SSL certificates (Let's Encrypt)

We use **webroot** challenge. First, ensure HTTP works and nginx serves `/.well-known/acme-challenge/`:

```bash
curl -I http://tenot.ru
```

Install certbot:

```bash
sudo apt install -y certbot
```

Create the webroot folder (already in repo):

```bash
mkdir -p infra/nginx/www
```

Issue cert:

```bash
sudo certbot certonly --webroot \
  -w /home/ubuntu/tenot-full/infra/nginx/www \
  -d tenot.ru
```

If you also want `tenor.ru`:

```bash
sudo certbot certonly --webroot \
  -w /home/ubuntu/tenot-full/infra/nginx/www \
  -d tenor.ru
```

## 6) Copy certs into the project for docker nginx

Nginx container reads certs from `./infra/nginx/ssl`. Copy from system:

```bash
sudo ./scripts/sync_letsencrypt_to_project.sh
```

Restart:

```bash
docker compose restart nginx
```

## 7) Protect /admin (recommended)

Create basic-auth file:

```bash
sudo apt install -y apache2-utils
mkdir -p infra/nginx/auth
htpasswd -c infra/nginx/auth/.htpasswd admin
```

Restart nginx:

```bash
docker compose restart nginx
```

## 8) UFW firewall (recommended)

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 9) Backups

Manual backup:

```bash
./scripts/backup_db.sh
```

Restore:

```bash
./scripts/restore_db.sh ./backups/autoparts_YYYY-MM-DD_HH-MM-SS.sql.gz
```

Cron example (daily 03:00):

```cron
0 3 * * * cd /home/ubuntu/tenot-full && ./scripts/backup_db.sh >/dev/null 2>&1
```

## 10) Cert renew automation

Test renew:

```bash
sudo certbot renew --dry-run
```

After renew, sync certs into repo and restart nginx:

```bash
sudo ./scripts/sync_letsencrypt_to_project.sh
```

You can schedule that with cron (daily 04:00):

```cron
0 4 * * * cd /home/ubuntu/tenot-full && sudo ./scripts/sync_letsencrypt_to_project.sh >/dev/null 2>&1
```

## Вход по SMS-коду (SMS.ru)

1. Зарегистрироваться на https://sms.ru, пополнить баланс, взять `api_id` в разделе «Программистам».
2. В `.env` (root):
   ```env
   SMS_PROVIDER=smsru
   SMSRU_API_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   # SMSRU_FROM=TENOT   # после согласования буквенного имени отправителя
   # SMSRU_TEST=1       # тестовый режим: SMS не уходит и не списывается
   ```
3. `docker compose up -d --build` и `docker compose exec api sh -lc "npx prisma migrate deploy"`.

По умолчанию `SMS_PROVIDER=console` — код пишется в логи API (`docker compose logs -f api`).

**Защита (настраивается env-переменными API, значения по умолчанию):**

| Ограничение | Переменная | По умолчанию |
|---|---|---|
| Повторная отправка на номер | `OTP_RESEND_SEC` | 60 с |
| Время жизни кода / длина | `OTP_TTL_SEC` / `OTP_CODE_LENGTH` | 300 с / 4 |
| Попыток ввода на код | `OTP_MAX_ATTEMPTS` | 5 |
| Кодов на номер | `OTP_LIMIT_PHONE_HOUR` / `_DAY` | 5 / 10 |
| Кодов с IP | `OTP_LIMIT_IP_HOUR` / `_DAY` | 10 / 30 |
| Кодов с устройства (`X-Device-Id`) | `OTP_LIMIT_DEVICE_HOUR` | 5 |
| Всего SMS в час (предохранитель бюджета) | `OTP_LIMIT_GLOBAL_HOUR` | 300 |

Дополнительно: только российские мобильные номера (+79…), nginx-зона `otp` (10 запросов/мин с IP).

**Новый провайдер или канал** (SMS Aero, звонок-код, Telegram Gateway): реализовать `OtpSender`
в `backend/api/src/auth/otp/senders/` и добавить его в `otp-sender.factory.ts` — остальной модуль не меняется.
