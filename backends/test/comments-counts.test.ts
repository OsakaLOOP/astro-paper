import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { buildApp } from "../src/app.js";

type Query = { sql: string; values?: unknown[] };

/** Minimal pg.Pool stand-in that records queries and replays canned rows. */
function stubPool(
  rows: { post_slug: string; total: string }[]
): { pool: Pool; queries: Query[] } {
  const queries: Query[] = [];
  const pool = {
    query: async (sql: string, values?: unknown[]) => {
      queries.push({ sql, values });
      return { rows };
    },
    connect: async () => {
      throw new Error("not used");
    },
  } as unknown as Pool;
  return { pool, queries };
}

async function makeApp(rows: { post_slug: string; total: string }[]) {
  const { pool, queries } = stubPool(rows);
  const app = await buildApp({
    pool,
    origins: ["https://www.loopo.cc"],
    getUser: async () => null,
  });
  return { app, queries };
}

test("GET /blog/comments/counts batches and zero-fills slugs", async () => {
  const { app, queries } = await makeApp([{ post_slug: "posts/a", total: "3" }]);
  try {
    const response = await app.inject({
      method: "GET",
      url: "/blog/comments/counts?posts=posts/a,posts/b",
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      items: [
        { post_slug: "posts/a", total: 3 },
        { post_slug: "posts/b", total: 0 },
      ],
    });
    // One query for any number of slugs, and deleted comments filtered out.
    assert.equal(queries.length, 1);
    assert.match(queries[0].sql, /deleted_at IS NULL/);
    assert.deepEqual(queries[0].values, [["posts/a", "posts/b"]]);
  } finally {
    await app.close();
  }
});

test("GET /blog/comments/counts deduplicates repeated slugs", async () => {
  const { app, queries } = await makeApp([{ post_slug: "posts/a", total: "7" }]);
  try {
    const response = await app.inject({
      method: "GET",
      url: "/blog/comments/counts?posts=posts/a,%20posts/a",
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      items: [{ post_slug: "posts/a", total: 7 }],
    });
    assert.deepEqual(queries[0].values, [["posts/a"]]);
  } finally {
    await app.close();
  }
});

test("GET /blog/comments/counts validates the slug list", async () => {
  const { app, queries } = await makeApp([]);
  try {
    const tooMany = Array.from(
      { length: 101 },
      (_, index) => `p${index}`
    ).join(",");
    // `posts=` is rejected by the schema (like `/blog/analytics`); the missing
    // and over-long lists are rejected by the handler.
    for (const [url, error] of [
      ["/blog/comments/counts", "POSTS_REQUIRED"],
      ["/blog/comments/counts?posts=", "INVALID_REQUEST"],
      [`/blog/comments/counts?posts=${tooMany}`, "POSTS_REQUIRED"],
    ] as const) {
      const response = await app.inject({ method: "GET", url });
      assert.equal(response.statusCode, 400, url);
      assert.equal(response.json().error, error, url);
    }
    assert.equal(queries.length, 0);
  } finally {
    await app.close();
  }
});
