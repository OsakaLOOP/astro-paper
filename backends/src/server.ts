import { Pool } from "pg";
import { buildApp } from "./app.js";
import { registerBff } from "./identity.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { createHmac } from "node:crypto";
if (process.getBuiltinModule("fs").existsSync(".env")) process.loadEnvFile(".env");
function required(key: string) { const value = process.env[key]; if (!value) throw new Error(`Missing ${key}`); return value; }
// Keep enough connections for concurrent auth and comments requests on the first page load.
const pool = new Pool({ connectionString: required("SITE_DATABASE_URL"), max: 10, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
const origins = required("FRONTEND_ORIGINS").split(",").map(s => new URL(s.trim()).origin);
const mailUrl = process.env.SM_MAIL_URL;
const mailSecret = process.env.SM_MAIL_SECRET;
const sendMail = mailUrl && mailSecret ? async (message: import("./app.js").MailMessage) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = { event_id: message.eventId, to: message.to, from_name: message.fromName, subject: message.subject, text: message.text, html: message.html };
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", mailSecret).update(`${message.eventId}.${timestamp}.${body}`).digest("hex");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(mailUrl, { method: "POST", headers: { "Content-Type": "application/json", "X-SM-Timestamp": String(timestamp), "X-SM-Signature": signature }, body });
      if (response.ok) return;
    } catch { /* retry the short service-to-service request */ }
    await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
  }
  throw new Error("SM mail request failed after retries");
} : undefined;
let bff: Awaited<ReturnType<typeof registerBff>>;
let app: Awaited<ReturnType<typeof buildApp>>;
app = await buildApp({ pool, origins, logger: true, commentsDebug: process.env.COMMENTS_DEBUG === "true", moderatorIds: (process.env.MODERATOR_IDS ?? "").split(","), authorEmail: process.env.AUTHOR_EMAIL, authorUserId: process.env.AUTHOR_USER_ID, autoSubscribeCommentsDefault: process.env.AUTO_SUBSCRIBE_COMMENTS_DEFAULT === "true", contentNotificationsDefault: process.env.CONTENT_NOTIFICATIONS_DEFAULT === "true", commandSecret: process.env.SITE_COMMAND_SECRET, analyticsSecret: process.env.SITE_ANALYTICS_SECRET ?? process.env.SITE_COMMAND_SECRET ?? required("SITE_SESSION_SECRET"), sendMail, getUser: (request: FastifyRequest, fresh?: boolean) => bff.getUser(request, fresh) });
await app.register(async (blog: FastifyInstance) => {
  bff = await registerBff(blog, { issuer: required("SITE_ISSUER"), clientId: required("SITE_CLIENT_ID"), clientSecret: required("SITE_CLIENT_SECRET"), secret: required("SITE_SESSION_SECRET"), origin: required("SITE_API_URL").replace(/\/$/, ""), frontendOrigins: origins, pool, schema: "site_blog" });
}, { prefix: "/blog" });
pool.on("error", () => app.log.error("Database connection failed"));
const cleanup = setInterval(() => { void pool.query("DELETE FROM site_blog.sessions WHERE expires_at < now()").catch(() => app.log.error("Session cleanup failed")); }, 3600_000);
cleanup.unref();
app.addHook("onClose", async () => { clearInterval(cleanup); await pool.end(); });
await app.listen({ host: process.env.HOST ?? "127.0.0.1", port: Number(process.env.PORT ?? 4100) });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { void app.close(); });
