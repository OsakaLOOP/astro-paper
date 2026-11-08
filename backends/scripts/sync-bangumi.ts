import { mkdir, writeFile } from "node:fs/promises";
import { createBangumiService } from "../src/bangumi.js";

// 只生成组件公开展示的数据；令牌和用户私有字段留在后端。
const service = createBangumiService();
if (!service.ids.length) throw new Error("请先配置 BANGUMI_SUBJECT_IDS");
const directory = new URL("../../src/data/bangumi/", import.meta.url);
await mkdir(directory, { recursive: true });
for (const id of service.ids) {
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
