import {
  startsWithSymbol,
  strongSpacingClassNames,
} from "./strongSpacing";

type Node = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

type Side = "start" | "end";

const edgeText = (node: Node | undefined, side: Side): string => {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  if (!node.children?.length) return "";

  const children = side === "start" ? node.children : node.children.toReversed();
  for (const child of children) {
    const value = edgeText(child, side);
    if (value) return value;
  }
  return "";
};

const addClassNames = (node: Node, classNames: string[]) => {
  if (!classNames.length) return;

  const current = node.properties?.className;
  const existing = Array.isArray(current)
    ? current.filter((value): value is string => typeof value === "string")
    : typeof current === "string"
      ? [current]
      : [];

  node.properties = {
    ...node.properties,
    className: [...new Set([...existing, ...classNames])],
  };
};

const transform = (node: Node) => {
  if (!node.children) return;

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (child.type === "element" && child.tagName === "strong") {
      addClassNames(
        child,
        strongSpacingClassNames(
          edgeText(node.children[index - 1], "end"),
          edgeText(node.children[index + 1], "start")
        )
      );
    }
    transform(child);
  }
};

export const rehypeStrongSpacing = () => (tree: Node) => {
  transform(tree);
};
