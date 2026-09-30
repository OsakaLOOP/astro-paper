import Fastify, { type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import type { Pool } from "pg";
import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { HttpError } from "./errors.js";

export type Identity = { id: string; profile: Record<string, unknown> };
export type MailMessage = {
  eventId: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};
export interface AppOptions {
  pool: Pool;
  origins: string[];
  getUser: (
    request: FastifyRequest,
    fresh?: boolean
  ) => Promise<Identity | null>;
  moderatorIds?: string[];
  authorEmail?: string;
  authorUserId?: string;
  notificationsEnabled?: boolean;
  autoSubscribeCommentsDefault?: boolean;
  contentNotificationsDefault?: boolean;
  commandSecret?: string;
  sendMail?: (message: MailMessage) => Promise<void>;
  logger?: boolean;
  commentsDebug?: boolean;
}
const uuid = { type: "string", format: "uuid" };
const post = {
  type: "string",
  minLength: 1,
  maxLength: 240,
  pattern: "^[a-zA-Z0-9_\\-/\\u0080-\\uffff]+$",
};
const body = { type: "string", minLength: 1, maxLength: 2000, pattern: "\\S" };
const websiteUrl = {
  type: "string",
  maxLength: 500,
  pattern: "^(?:https?://[^\\s]+)?$",
};
const params = { type: "object", required: ["id"], properties: { id: uuid } };
const fields =
  "id,post_slug,user_id,author_name,author_url,author_email,body,parent_id,created_at,updated_at,deleted_at,version";
const esc = (value: string) =>
  value.replace(
    /[&<>\"']/g,
    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '\"': "&quot;",
        "'": "&#39;",
      })[c]!
  );
function mailTemplate(
  article: string,
  url: string,
  author: string,
  content: string,
  action: string
) {
  const subject = `${action} · ${article}`;
  const text = `${action}\n\n${author}: ${content}\n\nOpen the discussion: ${url}\n\nManage comment notifications in your account.`;
  const html = `<div style="max-width:560px;margin:0 auto;font:16px/1.7 system-ui,sans-serif;color:#282728"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(action)} · ${esc(article)}</div><p style="color:#006cac;font:700 12px monospace;letter-spacing:.12em">LOOPO BLOG</p><h2 style="margin-bottom:8px">${esc(action)}</h2><p style="margin-top:0;color:#6b7280;font-size:14px">${esc(article)}</p><p><strong>${esc(author)}</strong></p><p style="white-space:pre-wrap">${esc(content)}</p><p><a href="${esc(url)}" style="color:#006cac">Open the discussion</a></p><hr style="border:0;border-top:1px solid #ece9e9;margin:24px 0"><p style="color:#6b7280;font-size:13px">Manage comment notifications in your account.</p></div>`;
  return { subject, text, html };
}
function contentMailTemplate(
  title: string,
  url: string,
  summary: string,
  action: "New article" | "Article updated"
) {
  const subject = `${action} · ${title}`;
  const text = `${action}\n\n${title}\n\n${summary}\n\nOpen the article: ${url}\n\nManage article and comment notifications in your account.`;
  const html = `<div style="max-width:560px;margin:0 auto;font:16px/1.7 system-ui,sans-serif;color:#282728"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(action)} · ${esc(title)}</div><p style="color:#006cac;font:700 12px monospace;letter-spacing:.12em">LOOPO BLOG</p><h2 style="margin-bottom:8px">${esc(action)}</h2><h3>${esc(title)}</h3><p style="white-space:pre-wrap">${esc(summary)}</p><p><a href="${esc(url)}" style="color:#006cac">Open the article</a></p><hr style="border:0;border-top:1px solid #ece9e9;margin:24px 0"><p style="color:#6b7280;font-size:13px">Manage article and content notifications in your account.</p></div>`;
  return { subject, text, html };
}
function validCommandSignature(
  body: string,
  eventId: string,
  timestamp: string | string[] | undefined,
  signature: string | string[] | undefined,
  secret: string | undefined
) {
  if (Array.isArray(timestamp) || Array.isArray(signature)) return false;
  if (!secret || !timestamp || !signature || !/^\d+$/.test(timestamp))
    return false;
  const timestampNumber = Number(timestamp);
  if (
    !Number.isSafeInteger(timestampNumber) ||
    Math.abs(Date.now() / 1000 - timestampNumber) > 300 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return false;
  const expected = createHmac("sha256", secret)
    .update(`${eventId}.${timestamp}.${body}`)
    .digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}
export async function buildApp(options: AppOptions) {
  const app = Fastify({
    logger: options.logger
      ? {
          redact: [
            "req.headers.cookie",
            "req.headers.authorization",
            "res.headers.set-cookie",
          ],
        }
      : false,
    bodyLimit: 16_384,
    trustProxy: ["172.30.0.2/32"],
    requestTimeout: 10_000,
  });
  const debugComments = (
    request: FastifyRequest,
    event: string,
    startedAt: number,
    details: Record<string, unknown> = {}
  ) => {
    if (!options.commentsDebug) return;
    request.log.info(
      {
        scope: "comments",
        event,
        elapsed_ms: +(performance.now() - startedAt).toFixed(1),
        ...details,
      },
      "comments trace"
    );
  };
  await app.register(cors, {
    origin: options.origins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    maxAge: 600,
  });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  app.addHook("onSend", async (_req, reply) => {
    reply
      .header("Cache-Control", "no-store")
      .header("X-Content-Type-Options", "nosniff");
  });
  app.setErrorHandler(
    (error: Error & { statusCode?: number }, request, reply) => {
      const status = error.statusCode ?? 500;
      if (status >= 500)
        request.log.error({ err: error }, "Blog API request failed");
      return reply.code(status).send({
        error:
          error instanceof HttpError
            ? error.code
            : status === 429
              ? "RATE_LIMITED"
              : status < 500
                ? "INVALID_REQUEST"
                : "SERVICE_UNAVAILABLE",
      });
    }
  );
  app.get("/health/ready", async () => {
    await options.pool.query("SELECT user_id FROM site_blog.profiles LIMIT 0");
    return { status: "ready", mail_configured: Boolean(options.sendMail) };
  });
  const current = async (request: FastifyRequest) => {
    const user = await options.getUser(request, true);
    if (!user) throw new HttpError(401, "AUTH_REQUIRED");
    return user;
  };
  const isAdmin = (user: Identity) =>
    Boolean(
      options.moderatorIds?.includes(user.id) ||
      options.authorUserId === user.id
    );
  const getProfile = async (user: Identity) => {
    const email = String(user.profile.email ?? "");
    const name =
      String(user.profile.name ?? "Reader").slice(0, 120) || "Reader";
    await options.pool.query(
      "INSERT INTO site_blog.profiles(user_id,display_name,email) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email",
      [user.id, name, email]
    );
    await options.pool.query(
      "INSERT INTO site_blog.notification_settings(user_id,email,auto_subscribe_comments,content_notifications_enabled) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email",
      [
        user.id,
        email,
        options.autoSubscribeCommentsDefault ?? false,
        options.contentNotificationsDefault ?? false,
      ]
    );
    const profile = (
      await options.pool.query<{ website_url: string | null }>(
        "SELECT website_url FROM site_blog.profiles WHERE user_id=$1",
        [user.id]
      )
    ).rows[0];
    return { name, email, website_url: profile?.website_url ?? "" };
  };
  const siteNotificationsEnabled = async () => {
    const row = (
      await options.pool.query<{ enabled: boolean }>(
        "SELECT enabled FROM site_blog.site_preferences WHERE key='comment_notifications'"
      )
    ).rows[0];
    return row?.enabled ?? options.notificationsEnabled ?? true;
  };
  const send = async (
    to: string,
    subject: string,
    text: string,
    html: string
  ) => {
    if (!(await siteNotificationsEnabled()) || !options.sendMail) return;
    await options.sendMail({ eventId: randomUUID(), to, subject, text, html });
  };
  const postUrl = (slug: string) =>
    `${process.env.PUBLIC_BLOG_ORIGIN ?? "https://www.loopo.cc"}/posts/${encodeURIComponent(slug)}/#comments`;
  const contentUrl = (slug: string) =>
    `${process.env.PUBLIC_BLOG_ORIGIN ?? "https://www.loopo.cc"}/posts/${encodeURIComponent(slug)}/`;
  async function notifyComment(
    postSlug: string,
    comment: {
      user_id: string;
      author_name: string;
      author_url?: string | null;
      author_email: string;
      body: string;
      parent_id?: string;
    }
  ) {
    if (!(await siteNotificationsEnabled()) || !options.sendMail) return;
    const recipients = new Map<string, string>();
    const senderEmail = comment.author_email.trim().toLowerCase();
    if (
      options.authorEmail &&
      options.authorEmail.trim().toLowerCase() !== senderEmail &&
      options.authorUserId !== comment.user_id
    )
      recipients.set(options.authorEmail.toLowerCase(), options.authorEmail);
    const subscriptions = await options.pool.query<{
      user_id: string;
      email: string;
    }>(
      "SELECT s.user_id,s.email FROM site_blog.comment_subscriptions s JOIN site_blog.notification_settings n ON n.user_id=s.user_id AND n.enabled WHERE s.post_slug=$1 AND s.enabled",
      [postSlug]
    );
    for (const item of subscriptions.rows)
      if (item.user_id !== comment.user_id && item.email.toLowerCase() !== senderEmail)
        recipients.set(item.email.toLowerCase(), item.email);
    if (comment.parent_id) {
      const parent = (
        await options.pool.query<{ user_id: string; author_email: string }>(
          "SELECT user_id,author_email FROM site_blog.comments WHERE id=$1",
          [comment.parent_id]
        )
      ).rows[0];
      if (
        parent?.author_email &&
        parent.user_id !== comment.user_id &&
        parent.author_email.toLowerCase() !==
          senderEmail &&
        (
          await options.pool.query(
            "SELECT 1 FROM site_blog.notification_settings WHERE email=$1 AND enabled",
            [parent.author_email]
          )
        ).rowCount
      )
        recipients.set(parent.author_email.toLowerCase(), parent.author_email);
    }
    recipients.delete(senderEmail);
    const excerpt = comment.body
      .replace(/[`*_>#\[\]()]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240);
    const template = mailTemplate(
      postSlug,
      postUrl(postSlug),
      comment.author_name,
      excerpt,
      comment.parent_id ? "New reply" : "New comment"
    );
    for (const to of recipients.values())
      await send(to, template.subject, template.text, template.html);
  }
  await app.register(async api => {
    api.addHook("onRequest", async request => {
      if (
        !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
        !options.origins.includes(request.headers.origin ?? "")
      )
        throw new HttpError(403, "ORIGIN_REJECTED");
    });
    api.get<{ Querystring: { post: string; after?: string; limit?: number } }>(
      "/blog/comments",
      {
        schema: {
          querystring: {
            type: "object",
            additionalProperties: false,
            required: ["post"],
            properties: {
              post,
              after: uuid,
              limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
            },
          },
        },
      },
      async request => {
        const startedAt = performance.now();
        debugComments(request, "request-start", startedAt, {
          post: request.query.post,
        });
        const viewer = await options.getUser(request);
        debugComments(request, "identity-resolved", startedAt, {
          authenticated: Boolean(viewer),
        });
        const admin = viewer ? isAdmin(viewer) : false;
        const limit = request.query.limit ?? 20;
        const visibility = admin
          ? ""
          : viewer
            ? " AND (deleted_at IS NULL OR user_id=$4)"
            : " AND deleted_at IS NULL";
        const values: (string | number | null)[] = [
          request.query.post,
          request.query.after ?? null,
          limit + 1,
        ];
        if (viewer && !admin) values.push(viewer.id);
        const rows = (
          await options.pool.query(
            `SELECT ${fields} FROM site_blog.comments WHERE post_slug=$1${visibility} AND ($2::uuid IS NULL OR (created_at,id) > (SELECT created_at,id FROM site_blog.comments WHERE id=$2 AND post_slug=$1)) ORDER BY created_at,id LIMIT $3`,
            values
          )
        ).rows;
        debugComments(request, "comments-queried", startedAt, {
          rows: rows.length,
        });
        const more = rows.length > limit;
        if (more) rows.pop();
        const count = (
          await options.pool.query(
            "SELECT count(*)::int AS total FROM site_blog.comments WHERE post_slug=$1 AND deleted_at IS NULL",
            [request.query.post]
          )
        ).rows[0].total;
        debugComments(request, "count-queried", startedAt, { total: count });
        const subscriptionRow = viewer
          ? (
              await options.pool.query<{ enabled: boolean }>(
                "SELECT enabled FROM site_blog.comment_subscriptions WHERE user_id=$1 AND post_slug=$2",
                [viewer.id, request.query.post]
              )
            ).rows[0]
          : undefined;
        const setting = viewer
          ? (
              await options.pool.query<{
                auto_subscribe_comments: boolean;
              }>(
                "SELECT auto_subscribe_comments FROM site_blog.notification_settings WHERE user_id=$1",
                [viewer.id]
              )
            ).rows[0]
          : undefined;
        const items = rows.map(({ user_id, author_email, ...item }) => ({
          ...item,
          can_edit: !item.deleted_at && viewer?.id === user_id,
          can_delete:
            !item.deleted_at &&
            Boolean(viewer && (viewer.id === user_id || admin)),
          is_admin: admin,
        }));
        const result = {
          items,
          total: count,
          subscribed: subscriptionRow?.enabled ?? false,
          subscription_configured: Boolean(subscriptionRow),
          auto_subscribe_comments: setting?.auto_subscribe_comments ?? false,
          viewer: viewer ? { id: viewer.id, is_admin: admin } : null,
          next_cursor: more ? rows.at(-1)?.id : null,
        };
        debugComments(request, "response-ready", startedAt, {
          items: items.length,
        });
        return result;
      }
    );
    api.post<{
      Body: {
        id: string;
        post: string;
        body: string;
        parent_id?: string;
        subscribe?: boolean;
      };
    }>(
      "/blog/comments",
      {
        config: { rateLimit: { max: 8, timeWindow: "1 minute" } },
        schema: {
          body: {
            type: "object",
            additionalProperties: false,
            required: ["id", "post", "body"],
            properties: {
              id: uuid,
              post,
              body,
              parent_id: uuid,
              subscribe: { type: "boolean" },
            },
          },
        },
      },
      async (request, reply) => {
        const user = await current(request);
        const p = await getProfile(user);
        const input = request.body;
        if (
          input.parent_id &&
          !(
            await options.pool.query(
              "SELECT 1 FROM site_blog.comments WHERE id=$1 AND post_slug=$2 AND deleted_at IS NULL",
              [input.parent_id, input.post]
            )
          ).rowCount
        )
          throw new HttpError(400, "INVALID_REPLY");
        const result = await options.pool.query(
          "INSERT INTO site_blog.comments(id,post_slug,user_id,author_name,author_url,author_email,body,parent_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO NOTHING RETURNING id",
          [
            input.id,
            input.post,
            user.id,
            p.name,
            p.website_url || null,
            p.email,
            input.body.trim(),
            input.parent_id ?? null,
          ]
        );
        if (!result.rowCount) throw new HttpError(409, "DUPLICATE_REQUEST");
        if (input.subscribe !== undefined)
          await options.pool.query(
            "INSERT INTO site_blog.comment_subscriptions(user_id,post_slug,email,enabled) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,post_slug) DO UPDATE SET email=excluded.email,enabled=excluded.enabled,updated_at=now()",
            [user.id, input.post, p.email, input.subscribe]
          );
        else if (
          (
            await options.pool.query<{ auto_subscribe_comments: boolean }>(
              "SELECT auto_subscribe_comments FROM site_blog.notification_settings WHERE user_id=$1",
              [user.id]
            )
          ).rows[0]?.auto_subscribe_comments
        )
          await options.pool.query(
            "INSERT INTO site_blog.comment_subscriptions(user_id,post_slug,email,enabled) VALUES($1,$2,$3,true) ON CONFLICT(user_id,post_slug) DO UPDATE SET email=excluded.email,enabled=true,updated_at=now()",
            [user.id, input.post, p.email]
          );
        void notifyComment(input.post, {
          user_id: user.id,
          author_name: p.name,
          author_url: p.website_url || null,
          author_email: p.email,
          body: input.body.trim(),
          parent_id: input.parent_id,
        }).catch(error =>
          request.log.error({ err: error }, "Comment notification failed")
        );
        return reply.code(201).send(result.rows[0]);
      }
    );
    api.patch<{
      Params: { id: string };
      Body: { body: string; version: number };
    }>(
      "/blog/comments/:id",
      {
        schema: {
          params,
          body: {
            type: "object",
            additionalProperties: false,
            required: ["body", "version"],
            properties: { body, version: { type: "integer", minimum: 1 } },
          },
        },
      },
      async request => {
        const user = await current(request);
        const result = await options.pool.query(
          "UPDATE site_blog.comments SET body=$3,version=version+1,updated_at=now() WHERE id=$1 AND user_id=$2 AND version=$4 AND deleted_at IS NULL RETURNING id",
          [
            request.params.id,
            user.id,
            request.body.body.trim(),
            request.body.version,
          ]
        );
        if (!result.rowCount) throw new HttpError(409, "COMMENT_CHANGED");
        return result.rows[0];
      }
    );
    api.delete<{ Params: { id: string } }>(
      "/blog/comments/:id",
      { schema: { params } },
      async (request, reply) => {
        const user = await current(request);
        const admin = isAdmin(user);
        const old = (
          await options.pool.query<{
            user_id: string;
            author_email: string;
            post_slug: string;
          }>(
            "SELECT user_id,author_email,post_slug FROM site_blog.comments WHERE id=$1 AND deleted_at IS NULL",
            [request.params.id]
          )
        ).rows[0];
        if (!old || (!admin && old.user_id !== user.id))
          throw new HttpError(404, "COMMENT_NOT_FOUND");
        await options.pool.query(
          "UPDATE site_blog.comments SET body='',deleted_at=now(),version=version+1 WHERE id=$1",
          [request.params.id]
        );
        if (admin && old.user_id !== user.id && old.author_email) {
          const mail = mailTemplate(
            old.post_slug,
            postUrl(old.post_slug),
            "The site admin",
            "Your comment was removed by an admin.",
            "Comment removed"
          );
          void send(old.author_email, mail.subject, mail.text, mail.html).catch(
            error =>
              request.log.error({ err: error }, "Deletion notification failed")
          );
        }
        return reply.code(204).send();
      }
    );
    api.get("/blog/account", async request => {
      const user = await current(request);
      const p = await getProfile(user);
      const admin = isAdmin(user);
      const setting = (
        await options.pool.query(
          "SELECT enabled,auto_subscribe_comments,content_notifications_enabled FROM site_blog.notification_settings WHERE user_id=$1",
          [user.id]
        )
      ).rows[0];
      const global = (
        await options.pool.query(
          "SELECT enabled FROM site_blog.site_preferences WHERE key='comment_notifications'"
        )
      ).rows[0];
      const subscriptions = (
        await options.pool.query(
          "SELECT post_slug,enabled,updated_at FROM site_blog.comment_subscriptions WHERE user_id=$1 AND enabled ORDER BY updated_at DESC",
          [user.id]
        )
      ).rows;
      return {
        user: { id: user.id, ...p },
        is_admin: admin,
        notifications_enabled: setting?.enabled ?? true,
        auto_subscribe_comments: setting?.auto_subscribe_comments ?? false,
        content_notifications_enabled:
          setting?.content_notifications_enabled ?? false,
        site_notifications_enabled: global?.enabled ?? true,
        subscriptions,
      };
    });
    api.patch<{
      Body: {
        name?: string;
        website_url?: string;
        notifications_enabled?: boolean;
        auto_subscribe_comments?: boolean;
        content_notifications_enabled?: boolean;
        site_notifications_enabled?: boolean;
      };
    }>(
      "/blog/account",
      {
        schema: {
          body: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string", minLength: 1, maxLength: 120 },
              website_url: websiteUrl,
              notifications_enabled: { type: "boolean" },
              auto_subscribe_comments: { type: "boolean" },
              content_notifications_enabled: { type: "boolean" },
              site_notifications_enabled: { type: "boolean" },
            },
          },
        },
      },
      async request => {
        const user = await current(request);
        const admin = isAdmin(user);
        const p = await getProfile(user);
        if (request.body.name)
          await options.pool.query(
            "UPDATE site_blog.profiles SET display_name=$2,updated_at=now() WHERE user_id=$1",
            [user.id, request.body.name.trim()]
          );
        if (request.body.website_url !== undefined)
          await options.pool.query(
            "UPDATE site_blog.profiles SET website_url=$2,updated_at=now() WHERE user_id=$1",
            [user.id, request.body.website_url.trim() || null]
          );
        if (request.body.notifications_enabled !== undefined)
          await options.pool.query(
            "UPDATE site_blog.notification_settings SET enabled=$2,updated_at=now() WHERE user_id=$1",
            [user.id, request.body.notifications_enabled]
          );
        if (
          request.body.auto_subscribe_comments !== undefined ||
          request.body.content_notifications_enabled !== undefined
        )
          await options.pool.query(
            "UPDATE site_blog.notification_settings SET auto_subscribe_comments=COALESCE($2,auto_subscribe_comments),content_notifications_enabled=COALESCE($3,content_notifications_enabled),updated_at=now() WHERE user_id=$1",
            [
              user.id,
              request.body.auto_subscribe_comments ?? null,
              request.body.content_notifications_enabled ?? null,
            ]
          );
        if (request.body.site_notifications_enabled !== undefined) {
          if (!admin) throw new HttpError(403, "ADMIN_REQUIRED");
          await options.pool.query(
            "UPDATE site_blog.site_preferences SET enabled=$1,updated_at=now() WHERE key='comment_notifications'",
            [request.body.site_notifications_enabled]
          );
        }
        return {
          ok: true,
          name: request.body.name?.trim() ?? p.name,
          website_url:
            request.body.website_url !== undefined
              ? request.body.website_url.trim()
              : p.website_url,
          notifications_enabled: request.body.notifications_enabled,
          auto_subscribe_comments: request.body.auto_subscribe_comments,
          content_notifications_enabled:
            request.body.content_notifications_enabled,
          site_notifications_enabled: request.body.site_notifications_enabled,
        };
      }
    );
    api.put<{ Params: { post: string }; Body: { enabled: boolean } }>(
      "/blog/account/subscriptions/:post",
      {
        schema: {
          params: { type: "object", required: ["post"], properties: { post } },
          body: {
            type: "object",
            additionalProperties: false,
            required: ["enabled"],
            properties: { enabled: { type: "boolean" } },
          },
        },
      },
      async request => {
        const user = await current(request);
        const p = await getProfile(user);
        await options.pool.query(
          "INSERT INTO site_blog.comment_subscriptions(user_id,post_slug,email,enabled) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,post_slug) DO UPDATE SET email=excluded.email,enabled=excluded.enabled,updated_at=now()",
          [user.id, request.params.post, p.email, request.body.enabled]
        );
        return { enabled: request.body.enabled };
      }
    );
  });
  app.post<{
    Body: {
      event_id: string;
      kind: "new_article" | "content_update";
      slug: string;
      title: string;
      summary?: string;
    };
  }>(
    "/blog/hooks/content",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["event_id", "kind", "slug", "title"],
          properties: {
            event_id: { type: "string", minLength: 1, maxLength: 200 },
            kind: { type: "string", enum: ["new_article", "content_update"] },
            slug: post,
            title: { type: "string", minLength: 1, maxLength: 240 },
            summary: { type: "string", maxLength: 2000 },
          },
        },
      },
    },
    async request => {
      const body = JSON.stringify(request.body);
      if (
        !validCommandSignature(
          body,
          request.body.event_id,
          request.headers["x-site-command-timestamp"],
          request.headers["x-site-command-signature"],
          options.commandSecret
        )
      )
        throw new HttpError(401, "COMMAND_UNAUTHORIZED");
      if (!options.sendMail)
        throw new HttpError(503, "MAIL_NOT_CONFIGURED");
      const recipients = (
        await options.pool.query<{ email: string }>(
          "SELECT email FROM site_blog.notification_settings WHERE content_notifications_enabled AND email <> ''"
        )
      ).rows;
      const template = contentMailTemplate(
        request.body.title,
        contentUrl(request.body.slug),
        request.body.summary?.trim() || "A new update is available on the blog.",
        request.body.kind === "new_article" ? "New article" : "Article updated"
      );
      const results = await Promise.allSettled(
        [...new Map(recipients.map(item => [item.email.toLowerCase(), item.email])).values()].map(
          to =>
            options.sendMail!({
              eventId: `${request.body.event_id}:${to.toLowerCase()}`,
              to,
              subject: template.subject,
              text: template.text,
              html: template.html,
            })
        )
      );
      const failed = results.filter(result => result.status === "rejected");
      if (failed.length) throw new HttpError(502, "MAIL_DELIVERY_FAILED");
      return { ok: true, sent: results.length };
    }
  );
  return app;
}
