import { execFileSync } from "node:child_process";
import { basename, extname, relative, resolve } from "node:path";
import { createHmac } from "node:crypto";
import { format } from "node:util";

const log = (...args) => process.stdout.write(`${format(...args)}\n`);
const logError = (...args) => process.stderr.write(`${format(...args)}\n`);

const strict = process.argv.includes("--strict");
const dryRun = process.argv.includes("--dry-run");
const commitArgument = process.argv.indexOf("--commit");
if (commitArgument !== -1 && !process.argv[commitArgument + 1]) {
  throw new Error("--commit requires a commit reference");
}
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const commit = execFileSync(
  "git",
  [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${commitArgument === -1 ? "HEAD" : process.argv[commitArgument + 1]}^{commit}`,
  ],
  {
    cwd: root,
    encoding: "utf8",
  }
).trim();
const commitMessage = execFileSync(
  "git",
  ["log", "-1", "--format=%B", commit],
  {
    cwd: root,
    encoding: "utf8",
  }
);
if (!commitMessage.includes("[notify]")) process.exit(0);

const api = process.env.BLOG_API_URL ?? process.env.PUBLIC_BLOG_API;
const secret = process.env.SITE_COMMAND_SECRET;
if (!dryRun && (!api || !secret)) {
  logError(
    "Content notifications skipped: BLOG_API_URL/PUBLIC_BLOG_API and SITE_COMMAND_SECRET are required."
  );
  process.exit(strict ? 1 : 0);
}

const hook = process.argv[2] ?? "commit";
const parent = execFileSync(
  "git",
  ["rev-list", "--parents", "-n", "1", commit],
  {
    cwd: root,
    encoding: "utf8",
  }
)
  .trim()
  .split(" ")[1];
const diffCommand =
  hook === "merge"
    ? ["diff", `ORIG_HEAD..${commit}`]
    : [
        "diff-tree",
        "--root",
        "--no-commit-id",
        "-r",
        ...(parent ? [parent, commit] : [commit]),
      ];
let changes;
try {
  changes = execFileSync(
    "git",
    [
      ...diffCommand,
      "--name-status",
      "-z",
      "--diff-filter=AMR",
      "--find-renames",
      "--",
      "src/content/posts",
    ],
    { cwd: root, encoding: "utf8" }
  );
} catch (error) {
  if (strict) logError("Content notification diff failed:", error);
  process.exit(strict ? 1 : 0);
}
if (!changes) process.exit(0);

const { parseFrontmatter } = await import("@astrojs/markdown-remark");
const readPost = file => {
  const source = execFileSync("git", ["show", `${commit}:${file}`], {
    cwd: root,
    encoding: "utf8",
  });
  const { frontmatter } = parseFrontmatter(source);
  for (const key of ["draft", "notify"]) {
    if (
      frontmatter[key] !== undefined &&
      typeof frontmatter[key] !== "boolean"
    ) {
      throw new Error(`${file}: ${key} must be a YAML boolean`);
    }
  }
  const publishedAt = new Date(frontmatter.pubDatetime).getTime();
  if (!Number.isFinite(publishedAt))
    throw new Error(`${file}: invalid pubDatetime`);
  return {
    title: frontmatter.title || basename(file, extname(file)),
    summary: frontmatter.description ?? "",
    skipReason:
      frontmatter.draft === true
        ? "draft"
        : frontmatter.notify === false
          ? "notify: false"
          : publishedAt > Date.now()
            ? "scheduled publication"
            : undefined,
  };
};
const slugFor = file =>
  relative(resolve(root, "src/content/posts"), resolve(root, file))
    .replace(/\\/g, "/")
    .replace(/\.(md|mdx)$/i, "");
const timestamp = Math.floor(Date.now() / 1000).toString();
const endpoint = api
  ? `${api.replace(/\/$/, "")}/blog/hooks/content`
  : undefined;
const entries = changes.split("\0");
while (entries.length > 1) {
  const status = entries.shift();
  let file = entries.shift();
  if (status.startsWith("R")) file = entries.shift();
  if (!file || !/\.(md|mdx)$/i.test(file) || basename(file).startsWith("_"))
    continue;
  let post;
  try {
    post = readPost(file);
  } catch (error) {
    logError(`Content notification skipped for ${file}:`, error);
    if (strict) process.exitCode = 1;
    continue;
  }
  const { title, summary, skipReason } = post;
  if (skipReason) {
    log(`Content notification skipped for ${file}: ${skipReason}`);
    continue;
  }
  const payload = {
    event_id: `${commit}:${file}`,
    kind: status === "A" ? "new_article" : "content_update",
    slug: slugFor(file),
    title,
    summary,
  };
  if (dryRun) {
    log(`Content notification dry run: ${JSON.stringify(payload)}`);
    continue;
  }
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret)
    .update(`${payload.event_id}.${timestamp}.${body}`)
    .digest("hex");
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Site-Command-Timestamp": timestamp,
        "X-Site-Command-Signature": signature,
      },
      body,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      logError(
        `Content notification failed for ${file}: ${response.status} ${await response.text()}`
      );
      if (strict) process.exitCode = 1;
    } else {
      log(
        `Content notification accepted for ${file}: ${await response.text()}`
      );
    }
  } catch (error) {
    logError(`Content notification failed for ${file}:`, error);
    if (strict) process.exitCode = 1;
  }
}
