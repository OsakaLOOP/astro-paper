import type { APIRoute, GetStaticPaths } from "astro";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";

export const getStaticPaths: GetStaticPaths = () =>
  [400, 700].map(weight => ({
    params: { weight: String(weight) },
    props: { weight },
  }));

export const GET: APIRoute = async context => {
  const fontPath = getFontPathByWeight(
    fontData["--font-og"],
    context.props.weight
  );
  if (!fontPath) throw new Error("Cannot find the email font path.");
  const response = await fetch(
    experimental_getFontFileURL(fontPath, context.url)
  );
  if (!response.ok) throw new Error("Cannot load the email font.");
  return new Response(await response.arrayBuffer(), {
    headers: { "Content-Type": "font/ttf" },
  });
};
