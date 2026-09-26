# Smoke checklist

Run after each phase (API up on PORT):

1. `GET /` → status Online
2. `POST /auth/login` with valid user → accessToken + refreshToken
3. `POST /auth/refresh` with refreshToken → new accessToken
4. `GET /resumo` with Bearer token → sucesso true
5. `GET /status` → api ONLINE
6. `node dist/sync.js` or `npm run sync` (optional date) → sync completes
7. Admin: `GET/POST /usuarios` (after security phase: requires ADMIN token)
