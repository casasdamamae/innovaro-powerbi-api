# Innovaro Power BI API

API Express + TypeScript (MVC) que sincroniza vendas do Innovaro para SQLite e alimenta o dashboard.

## Stack

- Node.js (ESM) + TypeScript
- Express 5
- SQLite (`sqlite3`)
- Redis (refresh tokens)
- JWT + bcryptjs

## Estrutura MVC

```text
src/
  app.ts              # Express app (rotas + middlewares)
  server.ts           # Bootstrap, listen, loop de sync
  sync.ts             # CLI de sincronização manual
  config/             # env, database, redis, schema
  middlewares/        # auth, errorHandler
  routes/             # wire HTTP → controllers
  controllers/        # handlers HTTP
  services/           # regras de negócio (auth, resumo, sync, innovaro)
  repositories/       # acesso a dados
  types/              # tipos compartilhados
```

## Setup

```bash
cp .env.example .env
# Preencha JWT_SECRET, BASE_URL, TOKEN, REDIS_URL

npm install
npm run dev
```

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `JWT_SECRET` | sim | Segredo do access token |
| `BASE_URL` | sim | URL da API Innovaro |
| `TOKEN` | sim | Bearer token Innovaro |
| `REDIS_URL` | sim | Redis para refresh tokens |
| `PORT` | não | Default `3000` |
| `DB_PATH` | não | Caminho do SQLite persistente |
| `CORS_ORIGIN` | não | Origens separadas por vírgula (`*` = aberto) |
| `ADMIN_PASSWORD` | não | Senha do admin seed (default `admin123`) |

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Dev com hot reload (`tsx watch`) |
| `npm run build` | Compila para `dist/` |
| `npm start` | Roda `dist/server.js` |
| `npm run sync` | Sync manual (`npm run sync -- 2026-03-25`) |
| `npm run typecheck` | `tsc --noEmit` |

## Auth

- `POST /auth/login` → `{ accessToken, refreshToken, usuario }`
- `POST /auth/refresh` → `{ accessToken, refreshToken }` (rotação: o refresh antigo é invalidado)
- Access token: 15 minutos
- Refresh: 7 dias no Redis

Quase todas as rotas de dados exigem `Authorization: Bearer <accessToken>`.

`/usuarios` exige JWT + nível `ADMIN`.

`GET /` e `GET /status` permanecem públicos.

## Segurança de senhas

- Senhas armazenadas com bcrypt
- Login aceita hash; se ainda houver senha em texto puro legada, migra automaticamente no login bem-sucedido

## Smoke checklist

Ver [SMOKE_CHECKLIST.md](SMOKE_CHECKLIST.md).
