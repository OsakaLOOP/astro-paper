import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import rehypeCallouts from "rehype-callouts";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import config from "./astro-paper.config";
import { rehypeEmoji, type EmojiManifest } from "./src/utils/emoji";

import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const emojiManifest = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("./public/emoji/manifest.json", import.meta.url)),
    "utf8"
  )
) as EmojiManifest;

export default defineConfig({
  site: config.site.url,
  integrations: [
    mdx(),
    sitemap({
      filter: page =>
        config.features?.showArchives !== false || !page.endsWith("/archives/"),
    }),
  ],
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeCallouts, rehypeKatex, rehypeEmoji(emojiManifest)],
    }),
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: "Google Sans Code",
      cssVariable: "--font-og",
      provider: fontProviders.local(),
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/google-sans-code-400.ttf"],
            weight: 400,
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/google-sans-code-700.ttf"],
            weight: 700,
            style: "normal",
          },
        ],
      },
      fallbacks: ["monospace"],
      weights: [400, 700],
      styles: ["normal"],
      formats: ["ttf"],
    },
    {
      name: "Noto Sans SC",
      cssVariable: "--font-og-cjk",
      provider: fontProviders.local(),
      options: {
        variants: [
          {
            src: [
              "./src/assets/fonts/noto-sans-sc-chinese-simplified-400-normal.woff",
            ],
            weight: 400,
            style: "normal",
          },
          {
            src: [
              "./src/assets/fonts/noto-sans-sc-chinese-simplified-700-normal.woff",
            ],
            weight: 700,
            style: "normal",
          },
        ],
      },
      fallbacks: ["sans-serif"],
      weights: [400, 700],
      styles: ["normal"],
      formats: ["woff"],
    },
  ],
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
