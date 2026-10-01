type Node = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

const isElement = (node: Node | undefined, tagName?: string) =>
  node?.type === "element" && (!tagName || node.tagName === tagName);

const isCaptionImage = (node: Node) => {
  if (!isElement(node, "img")) return false;
  const className = node.properties?.className;
  return !(Array.isArray(className) && className.includes("emoji-inline"));
};

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

const hasContent = (children: Node[]) =>
  children.some(child => child.type !== "text" || Boolean(child.value?.trim()));

const splitImageParagraph = (paragraph: Node) => {
  if (!paragraph.children?.some(isCaptionImage)) return null;

  const replacements: Node[] = [];
  let textChildren: Node[] = [];
  const flushText = () => {
    if (hasContent(textChildren)) {
      replacements.push({ ...paragraph, children: textChildren });
    }
    textChildren = [];
  };

  for (const child of paragraph.children) {
    if (isCaptionImage(child)) {
      flushText();
      replacements.push(createFigure(child));
    } else {
      textChildren.push(child);
    }
  }
  flushText();
  return replacements;
};

const transform = (node: Node) => {
  if (!node.children) return;

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (isElement(child, "p") && child.children) {
      const replacements = splitImageParagraph(child);
      if (replacements) {
        node.children.splice(index, 1, ...replacements);
        index += replacements.length - 1;
        continue;
      }
    }
    transform(child);
  }
};

export const rehypeImageCaptions = () => (tree: Node) => {
  transform(tree);
};
