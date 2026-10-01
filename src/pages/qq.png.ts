import type { APIRoute } from "astro";
import { generateSiteImage } from "./og.png";

export const GET: APIRoute = context => generateSiteImage(context, "qq");
