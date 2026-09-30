export type EmojiItem = {
  id: string;
  src: string;
  alt: string;
  type: string;
};

export type EmojiGroup = {
  id: string;
  label: string;
  items: EmojiItem[];
};

export type EmojiManifest = {
  version: number;
  groups: EmojiGroup[];
};

export const createEmojiIndex = (
  manifest: EmojiManifest
): ReadonlyMap<string, EmojiItem> =>
  new Map(
    manifest.groups.flatMap(group => group.items).map(item => [item.id, item])
  );

const emojiTokenPattern = /\(([^()\s]+_[^()\s]+)\)/gu;

export const splitEmojiText = (
  value: string,
  emojiIndex: ReadonlyMap<string, EmojiItem>
): Array<string | EmojiItem> => {
  if (!value.includes("(") || !value.includes("_")) return [value];

  emojiTokenPattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  const parts: Array<string | EmojiItem> = [];

  while ((match = emojiTokenPattern.exec(value))) {
    const item = emojiIndex.get(match[1]);
    if (!item) continue;
    if (match.index > lastIndex)
      parts.push(value.slice(lastIndex, match.index));
    parts.push(item);
    lastIndex = match.index + match[0].length;
  }

  if (!parts.length) return [value];
  if (lastIndex < value.length) parts.push(value.slice(lastIndex));
  return parts;
};

type EmojiNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: EmojiNode[];
};

const createImageNode = (item: EmojiItem): EmojiNode => ({
  type: "element",
  tagName: "img",
  properties: {
    className: ["emoji-inline"],
    src: item.src,
    alt: item.alt,
    title: item.alt,
    loading: "lazy",
    decoding: "async",
    draggable: false,
  },
  children: [],
});

const transformChildren = (
  node: EmojiNode,
  emojiIndex: ReadonlyMap<string, EmojiItem>
) => {
  if (!node.children || node.tagName === "code" || node.tagName === "pre")
    return;

  const children: EmojiNode[] = [];
  for (const child of node.children) {
    if (child.type !== "text" || child.value === undefined) {
      transformChildren(child, emojiIndex);
      children.push(child);
      continue;
    }

    for (const part of splitEmojiText(child.value, emojiIndex)) {
      children.push(
        typeof part === "string"
          ? { type: "text", value: part }
          : createImageNode(part)
      );
    }
  }
  node.children = children;
};

export const rehypeEmoji =
  (manifest: EmojiManifest) => () => (tree: EmojiNode) => {
    transformChildren(tree, createEmojiIndex(manifest));
  };
