import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://loopo.cc/",
    title: "Loopo:443",
    description: "Astro powered personal site",
    author: "Loopo",
    profile: "https://loopo.cc",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "Asia/Tokyo",
    dir: "ltr",
  },
  posts: {
    perPage: 8,
    perIndex: 4,
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