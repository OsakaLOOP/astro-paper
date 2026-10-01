import type { APIRoute } from "astro";
import { generatePostImage, getImageStaticPaths } from "./index.png";

export async function getStaticPaths() {
  return getImageStaticPaths("qq");
}

export const GET: APIRoute = context => generatePostImage(context, "qq");
