import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://www.loopo.cc/",
    title: "Loopo:443",
    description: "Personal blog of Loopo, a.k.a. Loop'Ōsaka, powered by Astro and AstroPaper, etc. Read the blog posts or check README for more info.",
    author: "Loopo",
    profile: "https://www.loopo.cc",
    ogImage: "default-og.png",
    lang: "en",
    timezone: "Asia/Tokyo",
    dir: "ltr",
  },
  posts: {
    perPage: 8,
    perIndex: 5,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: true,
      url: "https://github.com/OsakaLOOP/astro-paper/edit/main/",
    },
    search: "pagefind",
  },
  socials: [
    { name: "github",   url: "https://github.com/OsakaLOOP/astro-paper" },
    { name: "x",        url: "https://x.com/OsakaL00P" },
    { name: "qq",     url: "https://qm.qq.com/q/1qG8ivzHTq" },
  ],
  shareLinks: [
    { name: "x",        url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "mail",     url: "mailto:?subject=See%20this%20post&body=" },
    { name: "qq",       url: "http://connect.qq.com/widget/shareqq/index.html?url=" },
  ],
});
