import Fastify, { type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import type { Pool } from "pg";
import { HttpError } from "./errors.js";

export type Identity = { id: string; profile: Record<string, unknown> };
export interface AppOptions {
  pool: Pool;
  origins: string[];
  getUser: (request: FastifyRequest, fresh?: boolean) => Promise<Identity | null>;
  moderatorIds?: string[];
  logger?: boolean;
}
const uuid = { type: "string", format: "uuid" };
const post = { type: "string", minLength: 1, maxLength: 240, pattern: "^[a-zA-Z0-9_\\-/\\u0080-\\uffff]+$" };
const body = { type: "string", minLength: 1, maxLength: 2000, pattern: "\\S" };
const params = { type: "object", required: ["id"], properties: { id: uuid } };
const fields = "id,post_slug,user_id,author_name,body,parent_id,created_at,updated_at,deleted_at,version";
export async function buildApp(options: AppOptions) {
  const app = Fastify({ logger: options.logger ? { redact: ["req.headers.cookie", "req.headers.authorization", "res.headers.set-cookie"], serializers: { req: req => ({ method: req.method, url: req.url?.split("?")[0] }) } } : false, bodyLimit: 16_384, trustProxy: ["172.30.0.2/32"], requestTimeout: 10_000 });
  await app.register(cors, { origin: options.origins, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE"], allowedHeaders: ["Content-Type"], maxAge: 600 });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  app.addHook("onSend", async (_req, reply) => { reply.header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff"); });
  app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    const status = error.statusCode ?? 500;
    if (status >= 500) request.log.error({ err: error }, "Comment service request failed");
    return reply.code(status).send({ error: error instanceof HttpError ? error.code : status === 429 ? "RATE_LIMITED" : status < 500 ? "INVALID_REQUEST" : "SERVICE_UNAVAILABLE" });
  });
  app.get("/health/ready", async () => { await options.pool.query("SELECT id FROM site_blog.comments LIMIT 0"); return { status: "ready" }; });
  async function current(request: FastifyRequest) {
    const user = await options.getUser(request, true);
    if (!user) throw new HttpError(401, "AUTH_REQUIRED");
    return user;
  }
  await app.register(async api => {
    api.addHook("onRequest", async request => {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !options.origins.includes(request.headers.origin ?? "")) throw new HttpError(403, "ORIGIN_REJECTED");
    });
    api.get<{ Querystring: { post: string; after?: string; limit?: number } }>("/blog/comments", { schema: { querystring: { type: "object", additionalProperties: false, required: ["post"], properties: { post, after: uuid, limit: { type: "integer", minimum: 1, maximum: 50, default: 20 } } } } }, async request => {
      const limit = request.query.limit ?? 20;
      const user = await options.getUser(request);
      const rows = (await options.pool.query(`SELECT ${fields} FROM site_blog.comments WHERE post_slug=$1 AND ($2::uuid IS NULL OR (created_at,id) > (SELECT created_at,id FROM site_blog.comments WHERE id=$2 AND post_slug=$1)) ORDER BY created_at,id LIMIT $3`, [request.query.post, request.query.after ?? null, limit + 1])).rows;
      const more = rows.length > limit;
      if (more) rows.pop();
      const count = (await options.pool.query("SELECT count(*)::int AS total FROM site_blog.comments WHERE post_slug=$1 AND deleted_at IS NULL", [request.query.post])).rows[0].total;
      return { items: rows.map(({ user_id, ...item }) => ({ ...item, can_edit: !item.deleted_at && user?.id === user_id, can_delete: !item.deleted_at && Boolean(user && (user.id === user_id || options.moderatorIds?.includes(user.id))) })), total: count, next_cursor: more ? rows.at(-1)?.id : null };
    });
    api.post<{ Body: { id: string; post: string; body: string; parent_id?: string } }>("/blog/comments", { config: { rateLimit: { max: 8, timeWindow: "1 minute" } }, schema: { body: { type: "object", additionalProperties: false, required: ["id", "post", "body"], properties: { id: uuid, post, body, parent_id: uuid } } } }, async (request, reply) => {
      const user = await current(request);
      const input = request.body;
      const existing = (await options.pool.query("SELECT id,user_id,post_slug,body,parent_id FROM site_blog.comments WHERE id=$1", [input.id])).rows[0];
      if (existing) {
        if (existing.user_id !== user.id || existing.post_slug !== input.post || existing.body !== input.body.trim() || existing.parent_id !== (input.parent_id ?? null)) throw new HttpError(409, "DUPLICATE_REQUEST");
        return { id: existing.id };
      }
      if (input.parent_id && !(await options.pool.query("SELECT 1 FROM site_blog.comments WHERE id=$1 AND post_slug=$2 AND deleted_at IS NULL", [input.parent_id, input.post])).rowCount) throw new HttpError(400, "INVALID_REPLY");
      const result = await options.pool.query("INSERT INTO site_blog.comments(id,post_slug,user_id,author_name,body,parent_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING RETURNING id", [input.id, input.post, user.id, String(user.profile.name ?? "读者").slice(0, 120) || "读者", input.body.trim(), input.parent_id ?? null]);
      if (!result.rowCount) throw new HttpError(409, "DUPLICATE_REQUEST");
      return reply.code(201).send(result.rows[0]);
    });
    api.patch<{ Params: { id: string }; Body: { body: string; version: number } }>("/blog/comments/:id", { schema: { params, body: { type: "object", additionalProperties: false, required: ["body", "version"], properties: { body, version: { type: "integer", minimum: 1 } } } } }, async request => {
      const user = await current(request);
      const result = await options.pool.query("UPDATE site_blog.comments SET body=$3,version=version+1,updated_at=now() WHERE id=$1 AND user_id=$2 AND version=$4 AND deleted_at IS NULL RETURNING id", [request.params.id, user.id, request.body.body.trim(), request.body.version]);
      if (!result.rowCount) throw new HttpError(409, "COMMENT_CHANGED");
      return result.rows[0];
    });
    api.delete<{ Params: { id: string } }>("/blog/comments/:id", { schema: { params } }, async (request, reply) => {
      const user = await current(request);
      const result = await options.pool.query("UPDATE site_blog.comments SET body='',deleted_at=now(),version=version+1 WHERE id=$1 AND (user_id=$2 OR $3) AND deleted_at IS NULL RETURNING id", [request.params.id, user.id, Boolean(options.moderatorIds?.includes(user.id))]);
      if (!result.rowCount) throw new HttpError(404, "COMMENT_NOT_FOUND");
      return reply.code(204).send();
    });
  });
  return app;
}
