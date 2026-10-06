type Position = {
  start: { offset?: number };
  end: { offset?: number };
};

type Node = {
  type: string;
  value?: string;
  meta?: string | null;
  position?: Position;
  children?: Node[];
  data?: Record<string, unknown>;
};

type FileLike = {
  value?: unknown;
};

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && "type" in value;

const isFileLike = (value: unknown): value is FileLike =>
  typeof value === "object" && value !== null && "value" in value;

const isDoubleDollarInlineMath = (node: Node, file: FileLike) => {
  if (node.type !== "inlineMath" || !node.position) return false;

  const source = typeof file.value === "string" ? file.value : "";
  const start = node.position.start.offset;
  const end = node.position.end.offset;

  if (start === undefined || end === undefined) return false;

  const raw = source.slice(start, end);
  return raw.startsWith("$$") && raw.endsWith("$$");
};

const toDisplayMath = (node: Node): Node => ({
  type: "math",
  meta: null,
  value: node.value ?? "",
  position: node.position,
  data: {
    hName: "pre",
    hChildren: [
      {
        type: "element",
        tagName: "code",
        properties: {
          className: ["language-math", "math-display"],
        },
        children: [{ type: "text", value: node.value ?? "" }],
      },
    ],
  },
});

const transformNode = (node: Node, file: FileLike): Node[] => {
  if (!node.children) return [node];

  const children = node.children.flatMap(child =>
    transformNode(child, file)
  );

  if (node.type !== "paragraph") {
    return [{ ...node, children }];
  }

  const hasDisplayMath = children.some(child =>
    isDoubleDollarInlineMath(child, file)
  );

  if (!hasDisplayMath) {
    return [{ ...node, children }];
  }

  const blocks: Node[] = [];
  let paragraphChildren: Node[] = [];

  const flushParagraph = () => {
    if (paragraphChildren.length > 0) {
      blocks.push({ ...node, children: paragraphChildren });
      paragraphChildren = [];
    }
  };

  for (const child of children) {
    if (isDoubleDollarInlineMath(child, file)) {
      flushParagraph();
      blocks.push(toDisplayMath(child));
    } else {
      paragraphChildren.push(child);
    }
  }

  flushParagraph();
  return blocks;
};

export default function remarkDisplayMath() {
  return (tree: unknown, file: unknown) => {
    if (!isNode(tree) || !isFileLike(file) || !tree.children) return;
    tree.children = tree.children.flatMap(child => transformNode(child, file));
  };
}
