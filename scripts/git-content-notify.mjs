import { execFileSync } from "node:child_process";
import { basename, extname, relative, resolve } from "node:path";
import { createHmac } from "node:crypto";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const commitMessage = execFileSync("git", ["log", "-1", "--format=%B", commit], {
  cwd: root,
  encoding: "utf8",
});
if (!commitMessage.includes("[notify]")) process.exit(0);

const api = process.env.BLOG_API_URL ?? process.env.PUBLIC_BLOG_API;
const secret = process.env.SITE_COMMAND_SECRET;
if (!api || !secret) {
  console.error("Content notifications skipped: BLOG_API_URL/PUBLIC_BLOG_API and SITE_COMMAND_SECRET are required.");
  process.exit(0);
}

const hook = process.argv[2] ?? "commit";
const range = hook === "merge" ? "ORIG_HEAD..HEAD" : "HEAD^..HEAD";
let changes;
try {
  changes = execFileSync(
    "git",
    ["diff", "--name-status", "--diff-filter=AMR", "--find-renames", range, "--", "src/content/posts"],
    { cwd: root, encoding: "utf8" }
  ).trim();
} catch {
  process.exit(0);
}
if (!changes) process.exit(0);

const { parseFrontmatter } = await import("@astrojs/markdown-remark");
const readPost = file => {
  const source = execFileSync("git", ["show", `${commit}:${file}`], {
    cwd: root,
    encoding: "utf8",
  });
  const { frontmatter } = parseFrontmatter(source);
  return {
    title: frontmatter.title || basename(file, extname(file)),
    summary: frontmatter.description ?? "",
    notify: frontmatter.notify !== false,
  };
};
const slugFor = file => relative(resolve(root, "src/content/posts"), resolve(root, file)).replace(/\\/g, "/").replace(/\.(md|mdx)$/i, "");
const timestamp = Math.floor(Date.now() / 1000).toString();
const endpoint = `${api.replace(/\/$/, "")}/blog/hooks/content`;
for (const line of changes.split("\n")) {
  const [status, ...pathParts] = line.split(/\s+/);
  const file = pathParts.at(-1);
  if (!file || !/\.(md|mdx)$/i.test(file)) continue;
  const { title, summary, notify } = readPost(file);
  if (!notify) continue;
  const payload = {
    event_id: `${commit}:${file}`,
    kind: status === "A" ? "new_article" : "content_update",
    slug: slugFor(file),
    title,
    summary,
  };
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(`${payload.event_id}.${timestamp}.${body}`).digest("hex");
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Site-Command-Timestamp": timestamp,
        "X-Site-Command-Signature": signature,
      },
      body,
    });
    if (!response.ok) console.error(`Content notification failed for ${file}: ${response.status} ${await response.text()}`);
  } catch (error) {
    console.error(`Content notification failed for ${file}:`, error);
  }
}
