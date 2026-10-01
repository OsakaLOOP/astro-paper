# Blog comments service

The service keeps the blog session exchange and comments on the local PostgreSQL instance. Identity is delegated to SM through OIDC Authorization Code + PKCE; it never has access to SM's auth tables.

1. Register the service in SM as `blog`, origin `https://api.loopo.cc`, redirect URI `https://api.loopo.cc/blog/auth/callback`.
   `SM_ADMIN_COOKIE='session-cookie-value' ./register-sm.sh` performs the registration and prints the client credentials once.
2. Apply migrations with the migration role, set the `blog_app` password and grant the role listed in `003_grants.sql`.
3. Copy `.env.example` to `.env`, fill the client credentials and secrets, then run `npm ci && npm run build && npm start`.
4. Reverse proxy `https://api.loopo.cc/blog/*` to this service. Keep `auth.loopo.cc` as the SM issuer.

For comment reminders, set `SM_MAIL_URL=https://auth.loopo.cc/internal/site-mail` and
use the same random value for `SM_MAIL_SECRET` and SM's `BLOG_MAIL_SECRET`.
`AUTHOR_EMAIL` receives all article comment notices; `AUTHOR_USER_ID` enables
moderator deletion for the SM author account. Apply migrations in filename order,
including `004_notifications.sql`, before restarting the container. The blog
migrations are site-owned and must be applied with the SM migration role; they
are not part of SM's `core.schema_migrations` table.

## Article analytics

Apply `008_analytics.sql` with the same migration role. Configure
`SITE_ANALYTICS_SECRET` on this service and set `BLOG_ANALYTICS_SECRET` in SM
to the same random value (at least 32 characters). Set SM's
`BLOG_ANALYTICS_URL` to `https://api.loopo.cc/blog/analytics/admin`. The public
site uses the existing `PUBLIC_BLOG_API` endpoint; no separate analytics service
is required.

`POST /blog/analytics/view` records at most one view per article and visitor in
a rolling three-hour window. Authenticated visitors use their user ID and
anonymous visitors use an HMAC of their IP; a recent match on either the user
or IP also suppresses the event. Only aggregate counts are exposed by
`GET /blog/analytics`.
The SM-only signed analytics endpoint returns article totals, daily counts,
authenticated users, and recent visits. IP addresses are HMAC-hashed before
storage and are not exposed in the report.

For local development set `SITE_ISSUER=http://127.0.0.1:3000/api/auth`, `SITE_API_URL=http://127.0.0.1:4100`, and `FRONTEND_ORIGINS=http://127.0.0.1:4321`.
