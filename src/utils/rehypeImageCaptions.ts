type Node = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

const isElement = (node: Node | undefined, tagName?: string) =>
  node?.type === "element" && (!tagName || node.tagName === tagName);

const createCaption = (value: string): Node => ({
  type: "element",
  tagName: "figcaption",
  properties: {},
  children: [{ type: "text", value }],
});

const createFigure = (image: Node): Node => {
  const alt = image.properties?.alt;
  const caption = typeof alt === "string" ? alt.trim() : "";

  return {
    type: "element",
    tagName: "figure",
    properties: { className: ["post-image"] },
    children: [image, ...(caption ? [createCaption(caption)] : [])],
  };
};

const transform = (node: Node) => {
  if (!node.children) return;

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (isElement(child, "p") && child.children?.length === 1) {
      const image = child.children[0];
      if (isElement(image, "img")) {
        node.children[index] = createFigure(image);
        continue;
      }
    }
    transform(child);
  }
};

export const rehypeImageCaptions = () => (tree: Node) => {
  transform(tree);
};
