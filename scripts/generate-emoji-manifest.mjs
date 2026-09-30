import { existsSync, mkdirSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const emojiRoot = join(projectRoot, "public", "emoji");
const manifestPath = join(emojiRoot, "manifest.json");
const renameAssets = process.argv.includes("--rename");

const groups = [
  { directory: "2233", id: "2233", label: "2233", pattern: /^\[2233娘_(.+)\]$/u },
  {
    directory: "超てんじゃん",
    id: "choten",
    label: "超てんじゃん",
    pattern: /^\[超天酱表情包_(.+)\]$/u,
  },
  { directory: "AC 娘 Selected", id: "AC", label: "AC 娘 Selected", sequence: true },
  {
    directory: "Bangumi 娘 by 猫魚",
    id: "bgmmusume",
    label: "Bangumi 娘 by 猫魚",
    sequence: true,
  },
  {
    directory: "Bangumi TV Classic",
    id: "bgmtv",
    label: "Bangumi TV Classic",
    sequence: true,
  },
  {
    directory: "はるまきごはん",
    id: "hmg",
    label: "はるまきごはん",
    pattern: /^\[春卷饭10周年表情包_(.+)\]$/u,
  },
  {
    directory: "ブルアカ",
    id: "BA",
    label: "ブルアカ",
    pattern: /^\[蔚蓝档案表情包_(.+)\]$/u,
  },
  {
    directory: "プロセカ",
    id: "PJSK",
    label: "プロセカ",
    pattern: /^\[初音未来缤纷舞台_(.+)\]$/u,
  },
];

const compareNames = (left, right) =>
  left < right ? -1 : left > right ? 1 : 0;

const compareSourceNames = (left, right) => {
  const leftNumber = Number(left.match(/(\d+)(?=\.[^.]+$)/u)?.[1]);
  const rightNumber = Number(right.match(/(\d+)(?=\.[^.]+$)/u)?.[1]);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber)
    return leftNumber - rightNumber;
  return compareNames(left, right);
};

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizedPattern = id => new RegExp(`^${escapeRegExp(id)}_(.+)(\\.[^.]+)$`, "u");

const normalizeSuffix = suffix => {
  const normalized = suffix
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "")
    .replace(/\s+/gu, "-")
    .replace(/^[-_.]+|[-_.]+$/gu, "");
  return normalized || null;
};

const getFiles = directory =>
  readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && !entry.name.endsWith(".json"))
    .map(entry => entry.name)
    .sort(compareSourceNames);

const getExistingItems = (group, files) => {
  const pattern = normalizedPattern(group.id);
  if (!files.every(file => pattern.test(file))) return null;
  return files
    .map(file => {
      const match = file.match(pattern);
      return { file, suffix: match[1], extension: match[2] };
    })
    .sort((left, right) => compareNames(left.file, right.file));
};

const buildItems = (group, files) => {
  const existingItems = getExistingItems(group, files);
  if (existingItems) return existingItems;

  const usedSuffixes = new Set();
  return files.map((file, index) => {
    const extension = extname(file).toLowerCase();
    const sourceBase = file.slice(0, -extname(file).length);
    const extractedSuffix = group.pattern?.exec(sourceBase)?.[1];
    const suffix = group.sequence
      ? String(index + 1).padStart(2, "0")
      : normalizeSuffix(extractedSuffix) ?? String(index + 1).padStart(2, "0");
    let uniqueSuffix = suffix;
    let duplicateIndex = 2;
    while (usedSuffixes.has(uniqueSuffix)) {
      uniqueSuffix = `${suffix}-${duplicateIndex}`;
      duplicateIndex += 1;
    }
    usedSuffixes.add(uniqueSuffix);
    return { file, suffix: uniqueSuffix, extension };
  });
};

const renameGroup = (group, directory, items) => {
  const targets = items.map(item => `${group.id}_${item.suffix}${item.extension}`);
  const targetSet = new Set(targets);
  if (targetSet.size !== targets.length) throw new Error(`目标文件名冲突：${group.directory}`);

  const sourceSet = new Set(items.map(item => item.file));
  const changedItems = items.filter((item, index) => item.file !== targets[index]);
  for (const target of targets) {
    if (!sourceSet.has(target) && existsSync(join(directory, target)))
      throw new Error(`目标文件已存在：${join(directory, target)}`);
  }
  if (!changedItems.length) return items.map((item, index) => ({ ...item, file: targets[index] }));

  const temporaryItems = changedItems.map((item, index) => ({
    ...item,
    temporaryFile: `.emoji-rename-${process.pid}-${index}-${Date.now()}${item.extension}`,
  }));
  for (const item of temporaryItems) renameSync(join(directory, item.file), join(directory, item.temporaryFile));
  for (const item of temporaryItems) {
    const target = `${group.id}_${item.suffix}${item.extension}`;
    renameSync(join(directory, item.temporaryFile), join(directory, target));
  }
  return items.map((item, index) => ({ ...item, file: targets[index] }));
};

if (!existsSync(emojiRoot)) throw new Error(`表情目录不存在：${emojiRoot}`);

const manifestGroups = [];
const identifiers = new Set();
for (const group of groups) {
  const directory = join(emojiRoot, group.directory);
  if (!existsSync(directory)) throw new Error(`表情分组目录不存在：${directory}`);
  if (readdirSync(directory, { withFileTypes: true }).some(entry => entry.isDirectory()))
    throw new Error(`表情分组不得包含子目录：${directory}`);
  const sourceFiles = getFiles(directory);
  if (!sourceFiles.length) throw new Error(`表情分组为空：${directory}`);
  let items = buildItems(group, sourceFiles);
  if (renameAssets) items = renameGroup(group, directory, items);
  const manifestItems = items
    .map(item => {
      const id = item.file.slice(0, -item.extension.length);
      if (identifiers.has(id)) throw new Error(`表情标识重复：${id}`);
      identifiers.add(id);
      return {
        id,
        src: `/emoji/${encodeURIComponent(group.directory)}/${encodeURIComponent(item.file)}`,
        alt: `${group.label} ${item.suffix}`,
        type: item.extension.slice(1).toLowerCase(),
      };
    })
    .sort((left, right) => compareNames(left.id, right.id));
  manifestGroups.push({ id: group.id, label: group.label, items: manifestItems });
}

mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(
  manifestPath,
  `${JSON.stringify({ version: 1, groups: manifestGroups }, null, 2)}\n`,
  "utf8"
);

const action = renameAssets ? "已重命名并生成" : "已生成";
process.stdout.write(`${action}表情清单：${relative(projectRoot, manifestPath)}，共 ${identifiers.size} 个表情。\n`);
