/**
 * Blog API access.
 *
 * `blogApiOrigin` and `commentsDebug` come from `astro:env` (see the schema in
 * `astro.config.ts`), so the origin only needs to be configured once — either
 * through a `.env` file or the process environment.
 */
import { PUBLIC_BLOG_API, PUBLIC_COMMENTS_DEBUG } from "astro:env/client";

export const blogApiOrigin = PUBLIC_BLOG_API;
export const commentsDebug = PUBLIC_COMMENTS_DEBUG;

export class BlogRequestError extends Error {
  constructor(
    readonly kind: "http" | "network" | "timeout" | "response",
    readonly status?: number,
    readonly code?: string
  ) {
    super(kind);
    this.name = "BlogRequestError";
  }
}

const retryAfterMs = (response: Response) => {
  const value = response.headers.get("Retry-After");
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? 0 : Math.max(0, date - Date.now());
};

export async function requestBlogApi<Payload>(
  url: string,
  options: RequestInit = {}
): Promise<Payload | undefined> {
  const controller = new AbortController();
  const signal = options.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15_000);
  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      cache: "no-store",
      signal,
    });
    if (!response.ok) {
      let code: string | undefined;
      try {
        const payload = await response.json();
        if (
          typeof payload?.error === "string" &&
          /^[A-Z_]{1,80}$/.test(payload.error)
        )
          code = payload.error;
      } catch {}
      const error = new BlogRequestError("http", response.status, code);
      if (response.status === 429) {
        Object.defineProperty(error, "retryAfterMs", {
          value: retryAfterMs(response),
          enumerable: false,
        });
      }
      throw error;
    }
    if (response.status === 204 || response.status === 205) return;
    try {
      return await response.json();
    } catch (error) {
      if (signal.aborted) throw error;
      throw new BlogRequestError("response");
    }
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timedOut) throw new BlogRequestError("timeout");
    if (error instanceof BlogRequestError) throw error;
    throw new BlogRequestError("network");
  } finally {
    window.clearTimeout(timeout);
  }
}

export function describeBlogError(error: unknown): string {
  if (!(error instanceof BlogRequestError))
    return "The response could not be displayed. Please try again.";
  if (error.kind === "timeout")
    return "Request timed out after 15 seconds. Please try again.";
  if (error.kind === "network")
    return "Network error: the blog API could not be reached. Check your connection and try again.";
  if (error.kind === "response")
    return "The blog API returned an invalid response. Please try again.";
  const details = `HTTP ${error.status}${error.code ? ` · ${error.code}` : ""}`;
  if (error.status === 401)
    return `Your session has expired (${details}). Please log in again.`;
  if (error.status === 403) return `This action is not permitted (${details}).`;
  if (error.status === 409)
    return `The comment changed (${details}). Reload the comments before editing again.`;
  if (error.status === 429)
    return `Too many requests (${details}). Wait a moment before trying again.`;
  return `The blog API request failed (${details}). Please try again.`;
}
