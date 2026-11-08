import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AppOptions } from "./app.js";
import { bangumiTokenMailTemplate } from "./mail.js";

const api = "https://api.bgm.tv";
const userAgent =
  "OsakaLOOP/astro-paper (https://github.com/OsakaLOOP/astro-paper)";

export interface BangumiCardData {
  subject: {
    id: number;
    name: string;
    nameCn: string;
    image: string;
    summary: string;
    type: number;
    platform: string;
    date: string;
    infobox: { key: string; value: string }[];
    score: number;
    rank: number;
    total: number;
    counts: number[];
    episodes: number;
    volumes: number;
  };
  collection: {
    username: string;
    nickname: string;
    status: number;
    rate: number;
    episodes: number;
    volumes: number;
  } | null;
  updatedAt: string;
  stale: boolean;
  warning: string | null;
}

interface SubjectResponse {
  id: number;
  name: string;
  name_cn: string;
  images: { common?: string; large?: string };
  summary: string;
  type: number;
  platform: string;
  date?: string;
  infobox?: { key: string; value: string | { v: string }[] }[];
  rating: {
    score: number;
    rank: number;
    total: number;
    count: Record<string, number>;
  };
  eps: number;
  total_episodes: number;
  volumes: number;
}

class BangumiError extends Error {
  constructor(public status: number) {
    super(`Bangumi HTTP ${status}`);
  }
}

export function createBangumiService(env = process.env) {
  const token = env.BANGUMI_ACCESS_TOKEN;
  const expires = Date.parse(env.BANGUMI_TOKEN_EXPIRES_AT ?? "");
  const cache = new Map<number, { data: BangumiCardData; until: number }>();
  const pending = new Map<number, Promise<BangumiCardData>>();
  const covers = new Map<number, Promise<{ body: Buffer; type: string }>>();
  const coverDirectory = resolve("cache/bangumi");

  function tokenWarning() {
    return !token
      ? "token_missing"
      : expires <= Date.now()
        ? "token_expired"
        : expires - Date.now() < 14 * 86400_000
          ? "token_expiring"
          : null;
  }

  async function request<T>(path: string, authenticated = false): Promise<T> {
    const response = await fetch(`${api}${path}`, {
      headers: {
        "User-Agent": userAgent,
        ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new BangumiError(response.status);
    return response.json() as Promise<T>;
  }

  async function refresh(id: number): Promise<BangumiCardData> {
    const previous = cache.get(id)?.data;
    let warning: string | null = tokenWarning();
    let subject: BangumiCardData["subject"];
    try {
      let raw: SubjectResponse;
      try {
        raw = await request<SubjectResponse>(`/v0/subjects/${id}`);
      } catch (error) {
        if (
          !(error instanceof BangumiError) ||
          ![401, 403, 404].includes(error.status) ||
          !token ||
          warning === "token_expired"
        )
          throw error;
        raw = await request<SubjectResponse>(`/v0/subjects/${id}`, true);
      }
      if (raw.id !== id || !raw.name || !raw.rating || !raw.images)
        throw new Error("Bangumi 作品响应缺少必要字段");
      const keys = [
        "作者",
        "导演",
        "原作",
        "动画制作",
        "开发",
        "发行",
        "游戏类型",
        "艺术家",
        "作曲",
        "厂牌",
        "碟片数量",
        "插图",
        "出版社",
        "页数",
        "ISBN",
      ];
      subject = {
        id,
        name: raw.name,
        nameCn: raw.name_cn,
        image:
          raw.images.common || raw.images.large
            ? `/blog/bangumi/subjects/${id}/cover`
            : "",
        summary: raw.summary
          .replaceAll("&amp;", "&")
          .replace(/\s+/g, " ")
          .trim(),
        type: raw.type,
        platform: raw.platform,
        date: raw.date ?? "",
        infobox: (raw.infobox ?? [])
          .filter(item => keys.includes(item.key))
          .slice(0, 6)
          .map(item => ({
            key: item.key,
            value:
              typeof item.value === "string"
                ? item.value
                : item.value.map(part => part.v).join("、"),
          })),
        score: raw.rating.score,
        rank: raw.rating.rank,
        total: raw.rating.total,
        counts: Array.from(
          { length: 10 },
          (_, i) => raw.rating.count[String(i + 1)] ?? 0
        ),
        episodes: raw.eps || raw.total_episodes,
        volumes: raw.volumes,
      };
    } catch (error) {
      if (!previous) throw error;
      return { ...previous, stale: true, warning: "upstream_unavailable" };
    }

    let collection = previous?.collection ?? null;
    if (token && warning !== "token_expired") {
      try {
        const owner = await request<{ username: string; nickname: string }>(
          "/v0/me",
          true
        );
        try {
          const item = await request<{
            private: boolean;
            type: number;
            rate: number;
            ep_status: number;
            vol_status: number;
          }>(
            `/v0/users/${encodeURIComponent(owner.username)}/collections/${id}`,
            true
          );
          collection = item.private
            ? null
            : {
                username: owner.username,
                nickname: owner.nickname,
                status: item.type,
                rate: item.rate,
                episodes: item.ep_status,
                volumes: item.vol_status,
              };
        } catch (error) {
          if (error instanceof BangumiError && error.status === 404)
            collection = null;
          else throw error;
        }
      } catch (error) {
        warning =
          error instanceof BangumiError && [401, 403].includes(error.status)
            ? "token_expired"
            : "collection_unavailable";
      }
    }
    return {
      subject,
      collection,
      updatedAt: new Date().toISOString(),
      stale: false,
      warning,
    };
  }

  async function get(id: number): Promise<BangumiCardData> {
    const cached = cache.get(id);
    if (cached && cached.until > Date.now()) return cached.data;
    if (pending.has(id)) return pending.get(id)!;
    const task = refresh(id)
      .then(data => {
        if (cache.size >= 128) cache.delete(cache.keys().next().value!);
        cache.set(id, {
          data,
          until: Date.now() + (data.stale || data.warning ? 60_000 : 1800_000),
        });
        return data;
      })
      .finally(() => pending.delete(id));
    pending.set(id, task);
    return task;
  }
  async function loadCover(id: number) {
    const imagePath = resolve(coverDirectory, `${id}.image`);
    const metadataPath = resolve(coverDirectory, `${id}.json`);
    let cached: { body: Buffer; type: string; updatedAt: number } | undefined;
    try {
      const [body, metadata] = await Promise.all([
        readFile(imagePath),
        readFile(metadataPath, "utf8"),
      ]);
      cached = { body, ...JSON.parse(metadata) };
      if (Date.now() - cached!.updatedAt < 86400_000) return cached!;
    } catch {
      /* 首次请求时下载封面。 */
    }
    try {
      const response = await fetch(
        `${api}/v0/subjects/${id}/image?type=common`,
        {
          headers: { "User-Agent": userAgent },
          signal: AbortSignal.timeout(15_000),
        }
      );
      if (!response.ok) throw new BangumiError(response.status);
      const type = response.headers.get("Content-Type")?.split(";")[0] ?? "";
      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/avif",
        ].includes(type)
      )
        throw new Error("Bangumi 封面响应格式无效");
      const body = Buffer.from(await response.arrayBuffer());
      await mkdir(coverDirectory, { recursive: true });
      await Promise.all([
        writeFile(imagePath, body),
        writeFile(
          metadataPath,
          JSON.stringify({ type, updatedAt: Date.now() }),
          "utf8"
        ),
      ]);
      return { body, type };
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  }
  function getCover(id: number) {
    if (!covers.has(id)) {
      covers.set(
        id,
        loadCover(id).finally(() => covers.delete(id))
      );
    }
    return covers.get(id)!;
  }
  async function checkToken() {
    const warning = tokenWarning();
    if (warning === "token_missing" || warning === "token_expired")
      return warning;
    try {
      await request("/v0/me", true);
      return warning;
    } catch (error) {
      return error instanceof BangumiError && [401, 403].includes(error.status)
        ? "token_expired"
        : "collection_unavailable";
    }
  }
  return { get, getCover, checkToken };
}

export async function registerBangumi(
  app: FastifyInstance,
  options: Pick<AppOptions, "authorEmail" | "sendMail"> = {}
) {
  const service = createBangumiService();
  const notified = new Map<string, number>();
  let sending = false;
  async function notify(warning: string | null) {
    if (!warning || !["token_expiring", "token_expired"].includes(warning))
      return;
    if (sending || (notified.get(warning) ?? 0) > Date.now()) return;
    if (!options.authorEmail || !options.sendMail) {
      app.log.warn(
        "Bangumi 令牌提醒需要配置 AUTHOR_EMAIL、SM_MAIL_URL 和 SM_MAIL_SECRET"
      );
      return;
    }
    sending = true;
    try {
      const template = bangumiTokenMailTemplate(
        warning === "token_expired",
        process.env.BANGUMI_TOKEN_EXPIRES_AT
      );
      await options.sendMail({
        eventId: randomUUID(),
        to: options.authorEmail,
        ...template,
      });
      notified.set(warning, Date.now() + 86400_000);
    } catch {
      app.log.warn("Bangumi 令牌提醒邮件发送失败，将在后续检查时重试");
      notified.set(warning, Date.now() + 3600_000);
    } finally {
      sending = false;
    }
  }
  if (process.env.BANGUMI_ACCESS_TOKEN) {
    const check = async () => {
      await notify(await service.checkToken());
    };
    const timer = setInterval(() => {
      void check();
    }, 6 * 3600_000);
    timer.unref();
    app.addHook("onReady", async () => {
      void check();
    });
    app.addHook("onClose", async () => {
      clearInterval(timer);
    });
  }
  app.get<{ Params: { id: number } }>(
    "/blog/bangumi/subjects/:id/cover",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "integer",
              minimum: 1,
              maximum: Number.MAX_SAFE_INTEGER,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const cover = await service.getCover(request.params.id);
        return reply
          .type(cover.type)
          .header("Cache-Control", "public, max-age=86400")
          .send(cover.body);
      } catch (error) {
        request.log.warn(
          { subject: request.params.id },
          "Bangumi 封面获取失败，请检查代理和缓存目录权限"
        );
        return reply
          .code(
            error instanceof BangumiError && error.status === 404 ? 404 : 503
          )
          .send({ error: "BANGUMI_COVER_UNAVAILABLE" });
      }
    }
  );
  app.get<{ Params: { id: number } }>(
    "/blog/bangumi/subjects/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "integer",
              minimum: 1,
              maximum: Number.MAX_SAFE_INTEGER,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const data = await service.get(request.params.id);
        void notify(data.warning);
        if (data.warning)
          request.log.warn(
            { subject: request.params.id, warning: data.warning },
            "Bangumi 数据更新提示，请检查令牌有效期和代理配置"
          );
        return data;
      } catch (error) {
        if (error instanceof BangumiError && error.status === 404)
          return reply.code(404).send({ error: "BANGUMI_SUBJECT_NOT_FOUND" });
        request.log.warn(
          { subject: request.params.id },
          "Bangumi 作品暂时无法获取，请检查代理配置"
        );
        return reply.code(503).send({ error: "BANGUMI_UNAVAILABLE" });
      }
    }
  );
}
