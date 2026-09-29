# Blog comments service

The service keeps the blog session exchange and comments on the local PostgreSQL instance. Identity is delegated to SM through OIDC Authorization Code + PKCE; it never has access to SM's auth tables.

1. Register the service in SM as `blog`, origin `https://api.loopo.cc`, redirect URI `https://api.loopo.cc/blog/auth/callback`.
   `SM_ADMIN_COOKIE='session-cookie-value' ./register-sm.sh` performs the registration and prints the client credentials once.
2. Apply migrations with the migration role, set the `blog_app` password and grant the role listed in `003_grants.sql`.
3. Copy `.env.example` to `.env`, fill the client credentials and secrets, then run `npm ci && npm run build && npm start`.
4. Reverse proxy `https://api.loopo.cc/blog/*` to this service. Keep `auth.loopo.cc` as the SM issuer.

For local development set `SITE_ISSUER=http://127.0.0.1:3000/api/auth`, `SITE_API_URL=http://127.0.0.1:4100`, and `FRONTEND_ORIGINS=http://127.0.0.1:4321`.
