import { glob, mkdir, readFile, writeFile } from "node:fs/promises";
import { createBangumiService } from "../src/bangumi.js";

// 只生成组件公开展示的数据；令牌和用户私有字段留在后端。
const service = createBangumiService();
const ids = new Set<number>();
const content = new URL("../../src/content/", import.meta.url);
for await (const file of glob("**/*.mdx", { cwd: content })) {
  const source = await readFile(
    new URL(file.replaceAll("\\", "/"), content),
    "utf8"
  );
  for (const match of source.matchAll(
    /<BangumiCard\b[^>]*\bsubjectId\s*=\s*\{\s*(\d+)\s*\}/g
  )) {
    ids.add(Number(match[1]));
  }
}
const directory = new URL("../../src/data/bangumi/", import.meta.url);
await mkdir(directory, { recursive: true });
for (const id of ids) {
  const data = await service.get(id);
  if (data.stale || data.warning)
    throw new Error(`作品 ${id} 同步失败：${data.warning}`);
  await writeFile(
    new URL(`${id}.json`, directory),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8"
  );
  console.log(
    `已同步 ${id}：${data.subject.name}，评分 ${data.subject.score}，个人评分 ${data.collection?.rate ?? "未评分"}`
  );
}
