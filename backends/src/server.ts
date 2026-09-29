import { Pool } from "pg";
import { buildApp } from "./app.js";
import { registerBff } from "./identity.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
if (process.getBuiltinModule("fs").existsSync(".env")) process.loadEnvFile(".env");
function required(key: string) { const value = process.env[key]; if (!value) throw new Error(`Missing ${key}`); return value; }
const pool = new Pool({ connectionString: required("SITE_DATABASE_URL"), max: 3, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
const origins = required("FRONTEND_ORIGINS").split(",").map(s => new URL(s.trim()).origin);
let bff: Awaited<ReturnType<typeof registerBff>>;
let app: Awaited<ReturnType<typeof buildApp>>;
app = await buildApp({ pool, origins, logger: true, moderatorIds: (process.env.MODERATOR_IDS ?? "").split(","), getUser: (request: FastifyRequest, fresh?: boolean) => bff.getUser(request, fresh) });
await app.register(async (blog: FastifyInstance) => {
  bff = await registerBff(blog, { issuer: required("SITE_ISSUER"), clientId: required("SITE_CLIENT_ID"), clientSecret: required("SITE_CLIENT_SECRET"), secret: required("SITE_SESSION_SECRET"), origin: required("SITE_API_URL").replace(/\/$/, ""), frontendOrigins: origins, pool, schema: "site_blog" });
}, { prefix: "/blog" });
pool.on("error", () => app.log.error("Database connection failed"));
const cleanup = setInterval(() => { void pool.query("DELETE FROM site_blog.sessions WHERE expires_at < now()").catch(() => app.log.error("Session cleanup failed")); }, 3600_000);
cleanup.unref();
app.addHook("onClose", async () => { clearInterval(cleanup); await pool.end(); });
await app.listen({ host: process.env.HOST ?? "127.0.0.1", port: Number(process.env.PORT ?? 4100) });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { void app.close(); });
