type Position = {
  start: { offset?: number };
  end: { offset?: number };
};

type Node = {
  type: string;
  value?: string;
  position?: Position;
  children?: Node[];
};

type FileLike = {
  value?: unknown;
};

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && "type" in value;

const isFileLike = (value: unknown): value is FileLike =>
  typeof value === "object" && value !== null && "value" in value;

const countBoldMarkers = (source: string) => {
  let count = 0;

  for (let index = 0; index < source.length; index++) {
    if (source[index] === "\\") {
      index++;
      continue;
    }

    if (source[index] === "`") {
      let runLength = 1;
      while (source[index + runLength] === "`") runLength++;

      let cursor = index + runLength;
      while (cursor < source.length) {
        let closingLength = 0;
        while (source[cursor + closingLength] === "`") closingLength++;
        if (closingLength === runLength) {
          cursor += closingLength;
          break;
        }
        cursor++;
      }

      index = cursor - 1;
      continue;
    }

    if (source[index] === "*" && source[index + 1] === "*") {
      count++;
      index++;
    }
  }

  return count;
};

const inspectStrong = (nodes: Node[]) => {
  let count = 0;
  let maxDepth = 0;
  let hasLiteralMarker = false;

  const walk = (children: Node[], depth: number) => {
    for (const node of children) {
      if (node.type === "text" && node.value?.includes("**")) {
        hasLiteralMarker = true;
      }
      if (node.type === "strong") {
        count++;
        maxDepth = Math.max(maxDepth, depth);
      }
      if (node.children) {
        walk(node.children, node.type === "strong" ? depth + 1 : depth);
      }
    }
  };

  walk(nodes, 1);
  return { count, maxDepth, hasLiteralMarker };
};

const parseSequentialInline = (source: string) => {
  const root: Node[] = [];
  let current = root;
  let strong: Node | null = null;
  let textBuffer = "";

  const flushText = () => {
    if (!textBuffer) return;
    const last = current.at(-1);
    if (last?.type === "text") {
      last.value = (last.value ?? "") + textBuffer;
    } else {
      current.push({ type: "text", value: textBuffer });
    }
    textBuffer = "";
  };

  for (let index = 0; index < source.length; index++) {
    const char = source[index];

    if (char === "\\" && index + 1 < source.length) {
      textBuffer += source[index + 1];
      index++;
      continue;
    }

    if (char === "`") {
      let runLength = 1;
      while (source[index + runLength] === "`") runLength++;

      let cursor = index + runLength;
      let closingStart = -1;
      while (cursor < source.length) {
        let closingLength = 0;
        while (source[cursor + closingLength] === "`") closingLength++;
        if (closingLength === runLength) {
          closingStart = cursor;
          cursor += closingLength;
          break;
        }
        cursor++;
      }

      if (closingStart === -1) {
        textBuffer += char;
        continue;
      }

      flushText();
      let value = source
        .slice(index + runLength, closingStart)
        .replace(/\n/g, " ");
      if (value.startsWith(" ") && value.endsWith(" ") && value.trim()) {
        value = value.slice(1, -1);
      }
      current.push({ type: "inlineCode", value });
      index = cursor - 1;
      continue;
    }

    if (char === "$") {
      let cursor = index + 1;
      while (cursor < source.length && source[cursor] !== "$") cursor++;
      if (cursor < source.length) {
        flushText();
        current.push({
          type: "inlineMath",
          value: source.slice(index + 1, cursor),
        });
        index = cursor;
        continue;
      }
    }

    if (char === "*" && source[index + 1] === "*") {
      flushText();
      if (strong) {
        current = root;
        strong = null;
      } else {
        strong = { type: "strong", children: [] };
        current.push(strong);
        current = strong.children as Node[];
      }
      index++;
      continue;
    }

    textBuffer += char === "\n" ? " " : char;
  }

  flushText();
  return strong ? null : root;
};

const transformContainer = (node: Node, file: FileLike): Node => {
  if (!node.children) return node;

  if (node.type !== "paragraph" && node.type !== "heading") {
    return {
      ...node,
      children: node.children.map(child => transformContainer(child, file)),
    };
  }

  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  const source = typeof file.value === "string" ? file.value : "";
  if (start === undefined || end === undefined) return node;

  const raw = source.slice(start, end);
  const markerCount = countBoldMarkers(raw);
  if (markerCount === 0 || markerCount % 2 !== 0) return node;

  const { count, maxDepth, hasLiteralMarker } = inspectStrong(node.children);
  const expected = markerCount / 2;
  if (count === expected && maxDepth <= 1 && !hasLiteralMarker) return node;

  const children = parseSequentialInline(raw.trim());
  return children ? { ...node, children } : node;
};

export default function remarkSequentialStrong() {
  return (tree: unknown, file: unknown) => {
    if (!isNode(tree) || !isFileLike(file) || !tree.children) return;
    tree.children = tree.children.map(child => transformContainer(child, file));
  };
}
