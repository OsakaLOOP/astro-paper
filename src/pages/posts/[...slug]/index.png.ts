import type { APIContext, APIRoute } from "astro";
import { getCollection } from "astro:content";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import satori, { type SatoriOptions } from "satori";
import sharp from "sharp";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";
import { getPostSlug } from "@/utils/getPostPaths";
import { renderQqImage } from "@/utils/renderQqImage";
import config from "@/config";

export async function getStaticPaths() {
  return getImageStaticPaths();
}

export async function getImageStaticPaths(target: "og" | "qq" = "og") {
  if (!config.features.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("posts").then(p =>
    p.filter(({ data }) => !data.draft && (target === "qq" || !data.ogImage))
  );

  return posts.map(post => ({
    params: { slug: getPostSlug(post.id, post.filePath) },
    props: post,
  }));
}

export const GET: APIRoute = context => generatePostImage(context);

export async function generatePostImage(
  { props, url }: APIContext,
  target: "og" | "qq" = "og"
) {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
  }

  const fonts = fontData["--font-og"];
  const regularFontPath = getFontPathByWeight(fonts, 400);
  const boldFontPath = getFontPathByWeight(fonts, 700);

  if (regularFontPath === undefined || boldFontPath === undefined) {
    throw new Error("Cannot find the font path.");
  }

  const [regularData, boldData] = await Promise.all([
    fetch(experimental_getFontFileURL(regularFontPath, url)).then(res =>
      res.arrayBuffer()
    ),
    fetch(experimental_getFontFileURL(boldFontPath, url)).then(res =>
      res.arrayBuffer()
    ),
  ]);
  const cjkFonts = fontData["--font-og-cjk"];
  const cjkRegularPath = getFontPathByWeight(cjkFonts, 400);
  const cjkBoldPath = getFontPathByWeight(cjkFonts, 700);

  if (cjkRegularPath === undefined || cjkBoldPath === undefined) {
    throw new Error("Cannot find the CJK font path.");
  }

  const [cjkRegularData, cjkBoldData] = await Promise.all([
    fetch(experimental_getFontFileURL(cjkRegularPath, url)).then(res =>
      res.arrayBuffer()
    ),
    fetch(experimental_getFontFileURL(cjkBoldPath, url)).then(res =>
      res.arrayBuffer()
    ),
  ]);

  const imageFonts: SatoriOptions["fonts"] = [
    {
      name: "Google Sans Code",
      data: regularData,
      weight: 400,
      style: "normal",
    },
    { name: "Google Sans Code", data: boldData, weight: 700, style: "normal" },
    {
      name: "Noto Sans SC",
      data: cjkRegularData,
      weight: 400,
      style: "normal",
    },
    { name: "Noto Sans SC", data: cjkBoldData, weight: 700, style: "normal" },
  ];
  if (target === "qq") {
    const svg = await renderQqImage({
      title: props.data.title,
      footer: `by ${props.data.author} · ${config.site.title}`,
      fonts: imageFonts,
    });
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    return new Response(new Uint8Array(pngBuffer), {
      headers: { "Content-Type": "image/png" },
    });
  }
  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          background: "#fefbfb",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "-1px",
                right: "-1px",
                border: "4px solid #000",
                background: "#ecebeb",
                opacity: "0.9",
                borderRadius: "4px",
                display: "flex",
                justifyContent: "center",
                margin: "2.5rem",
                width: "88%",
                height: "80%",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                border: "4px solid #000",
                background: "#fefbfb",
                borderRadius: "4px",
                display: "flex",
                justifyContent: "center",
                margin: "2rem",
                width: "88%",
                height: "80%",
              },
              children: {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    margin: "20px",
                    width: "90%",
                    height: "90%",
                  },
                  children: [
                    {
                      type: "p",
                      props: {
                        style: {
                          fontSize: 72,
                          fontWeight: "bold",
                          maxHeight: "84%",
                          overflow: "hidden",
                        },
                        children: props.data.title,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          justifyContent: "space-between",
                          width: "100%",
                          marginBottom: "8px",
                          fontSize: 28,
                        },
                        children: [
                          {
                            type: "span",
                            props: {
                              children: [
                                "by ",
                                {
                                  type: "span",
                                  props: {
                                    style: { color: "transparent" },
                                    children: '"',
                                  },
                                },
                                {
                                  type: "span",
                                  props: {
                                    style: {
                                      overflow: "hidden",
                                      fontWeight: "bold",
                                    },
                                    children: props.data.author,
                                  },
                                },
                              ],
                            },
                          },
                          {
                            type: "span",
                            props: {
                              style: {
                                overflow: "hidden",
                                fontWeight: "bold",
                              },
                              children: config.site.title,
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: imageFonts,
    }
  );

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
}
