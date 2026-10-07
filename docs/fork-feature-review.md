# Loopo:443 × AstroPaper 分叉评审：新增功能、设计与适配

> 评审对象：`OsakaLOOP/astro-paper`（工作分支 `arena/a77224bb-astro-paper`，HEAD `855e2c2`）
> 对比基线：上游 `satnaing/astro-paper@main`（本次克隆 `35cfa7f`，`package.json` v6.1.0）
> 评审日期：2026-10-07 ｜ 评审方式：全量源码 diff + 实机构建/类型检查/静态预览

---

## 0. 结论速览

| 维度 | 评分 | 一句话结论 |
| --- | --- | --- |
| **完整性** | ★★★★☆ 4.0 → ★★★★½ 4.5 | 功能闭环程度远超"主题美化"级别（评论/账户/通知/统计自成体系）。初评的四处收尾缺口——CI 红、README 断链、CHANGELOG 未同步、零测试——§7 已全部处理（测试为最小可用集，见 §7.9）。 |
| **现代性** | ★★★★½ 4.5 | Astro 7 + Tailwind v4 CSS-first + View Transitions + OIDC PKCE BFF + 幂等/乐观锁 + `dvh`/`inert`/`AbortSignal.any`，属于 2026 年的前沿组合；残留少量手写 DOM 与 `confirm()` 式实现。 |
| **风格吻合度** | ★★★★☆ 4.0 | *视觉与交互* 层面几乎无可挑剔地延续了上游语言（虚线分隔、等宽字体、dashed focus、reduced-motion），并有两处超越上游；*工程组织* 层面偏离明显：新增功能完全绕过上游的「类型化配置层 + i18n 层」，CSS 也搬到了全局。 |

> **更新（同分支已修复）**：本报告初稿列出的 P0 项——`lint`/`format:check` 红灯、README 断链、运行指引指向上游模板、注释漂移——以及 P1 中的若干项（配置/环境变量收敛、i18n 补全、死代码清理、页脚 N+1、后端 `trustProxy` 硬编码、未使用依赖）均已在同一分支落地并通过实机验证，详见 **§7 修复记录**。修复后 `lint`、`format:check`、`astro check`、`astro build`、后端 `tsc --noEmit` 全部通过。

**最值得肯定**：ClientRouter 生命周期适配（`astro:page-load` / `astro:before-swap` / 跨页持久 Header）——这是上游示例代码里最容易踩坑的地方，作者按规范处理并写进了规格文档。
**最需要修**：`pnpm lint` 与 `pnpm format:check` 在上游通过、在本分叉失败，等于本仓库的 CI（`.github/workflows/ci.yml` 与上游逐字相同）在当前 HEAD 上是红的。

---

## 1. 评审方法与可复现证据

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 上游基线 | `git clone --depth 1 https://github.com/satnaing/astro-paper` | `35cfa7f`，v6.1.0 |
| 全量差异 | `diff -rq --exclude=.git --exclude=node_modules …` | 见 §2、§3 |
| 静态站构建 | `pnpm install --frozen-lockfile && pnpm run build`（`astro check` + `astro build` + `pagefind` + 同步 `public/pagefind`） | ✅ 通过，24 页，构建 11.8s，`dist/` 60 MB |
| 后端类型/构建 | 隔离副本内 `pnpm install && tsc --noEmit && tsc -p tsconfig.json` | ✅ 0 error，`dist/{app,identity,mail,security,server,errors}.js` 全部产出 |
| 代码风格（初评） | `pnpm run lint` / `pnpm run format:check` | ❌ 8 个 lint error / 7 个文件未格式化（上游同命令通过）→ **§7 已修复：0 error / 全绿** |
| 表情清单一致性 | `node scripts/generate-emoji-manifest.mjs` | ✅ 生成结果与仓库内 `public/emoji/manifest.json` 逐字节一致（8 组 334 项） |
| 实机预览 | `python3 -m http.server` 指向 `dist/` | ✅ `/`、`/posts/dev-notes/`、`/account/`、`/emoji/manifest.json` 均 200 |

> 环境备注：沙箱内 `npm ci`（backends）会触发 npm 自身的 `Exit handler never called!` 崩溃，属环境问题；改用隔离目录 + pnpm 安装后后端类型检查与构建均通过，因此文档中「后端 typecheck 通过」的说法得到证实。

---

## 2. 新增功能地图

### 2.1 全景

```
上游 AstroPaper v6.1                             本分叉 Loopo:443
├─ 单栏 3xl 布局                          →      ├─ 文章页双栏：14rem 侧栏 + 48rem 正文（max-w-app 3xl→6xl）
├─ 目录靠正文内 remark-toc 折叠块        →      ├─ sidebar 目录（h2–h4，聚焦虚线框跟随、自动滚窗）+ 标签云 + 滚动后出现的标题/时间/阅读摘要
├─ Google Fonts provider                  →      ├─ 本地字体：Google Sans Code(ttf) + Noto Sans SC（fontsource + 本地 woff），字号尺度整体重设
├─ 纯静态、无用户体系                     →      ├─ SM(OIDC) 登录 → 评论（嵌套回复/编辑/删除、表情贴图）→ 账户页 → 五类邮件通知
├─ 无统计                                 →      ├─ 文章/站点阅读统计（3h 去重、HMAC 哈希 IP、SM 管理端签名报表）+ 页脚 uptime/总浏览/总评论
├─ OG 图仅拉丁字形                        →      ├─ OG/QQ 双图：OG 1200×630，QQ 1200×1200（非 OG 平台 itemprop + 微信变量），内嵌 CJK 字体、按实测宽度自适应字号
├─ remark-toc + remark-collapse           →      ├─ remark-math + 自定义 remarkDisplayMath + rehype-katex（横向滚动公式）+ rehypeImageCaptions（img→figure/figcaption）+ rehypeEmoji
├─ giscus 教程（无实现）                  →      ├─ 自建评论后端 backends/（Fastify 5 + pg + 迁移 8 份 + Docker/compose + 负载脚本）
└─ CORS/无鉴权                            →      └─ 站点自有签名命令通道（`/blog/hooks/content`、`/blog/analytics/admin`）+ Git hooks + GitHub Actions 内容通知
```

### 2.2 逐项清单（含关键文件）

| # | 功能 | 关键实现 | 新增/改写 |
| --- | --- | --- | --- |
| A1 | 文章侧栏：目录 + 标签云 | `src/components/PostSidebar.astro`（383 行）、`global.css` 的 `.toc-focus` | 新增 |
| A2 | 侧栏滚动摘要 | 同上，`#post-header` 出视口后淡入标题/时间/阅读量 | 新增 |
| A3 | 标签计数 + 当前文章标签高亮（波浪下划线 `#tag`） | `Tag.astro`、`utils/getUniqueTags.ts#getTagCounts` | 改写 |
| A4 | 导航下划线改为 SVG 遮罩"书写/擦除"动画 | `global.css @utility nav-link`、`Header.astro#syncActiveNav`（延后两帧触发） | 改写 |
| A5 | `theme-color` 随主题变化 + 跨页保持 | `Layout.astro`、`scripts/theme.ts`（`astro:before-swap` 复制 meta） | 新增 |
| A6 | 图片说明（alt → figcaption、`figure.post-image` 样式） | `utils/rehypeImageCaptions.ts`（跳过 `emoji-inline`） | 新增 |
| A7 | 数学公式：`$$…$$` 行内写法升级为块级、KaTeX 横向滚动 | `utils/remarkDisplayMath.ts`、`scripts/math-scroll.ts`、`typography.css` | 新增 |
| A8 | 图片 lightbox（上游 v6.1 已有，含缩放/捏合/焦点陷阱） | `posts/[...slug]/index.astro`，与 View Transition 的 `before-swap` 联动 | 原样继承（未改动） |
| A9 | 阅读进度条/回顶按钮从内联脚本改为模块（可清理、可跨页） | `scripts/post-scroll.ts` | 重写 |
| B1 | 首页 HotLinks 头像列表 | `src/data/hotlinks.json` + `index.astro` 用 `import.meta.glob` 解析相对头像 | 新增 |
| B2 | 页脚：CC-BY-NC、两枚备案号、uptime/总浏览/总评论 | `Footer.astro`（+`scripts/blog-api` 拉取） | 改写 |
| B3 | Header 站标 favicon、`favicon.png`、`socials/qq.svg`、分享到 QQ | `Header.astro`、`astro-paper.config.ts` | 新增 |
| C1 | 评论系统（Markdown 预览、DOMPurify 消毒、嵌套回复、编辑带版本号、硬删除脱敏、`aria-live` 列表、失败重试） | `_components/Comments.astro`（833 行）、`scripts/blog-api.ts` | 新增 |
| C2 | 评论表情系统（8 组 334 项、h5 悬浮开、触屏滑动分页、清单缓存、`(id)` 语法、代码块内不替换） | `EmojiPicker.astro`、`utils/emoji.ts`、`scripts/generate-emoji-manifest.mjs` | 新增 |
| C3 | 账户页（昵称/站点/三项通知开关/订阅列表/安全入口） | `src/pages/account.astro` | 新增 |
| C4 | 身份：OIDC Authorization Code + PKCE 的 BFF，会话表 + AES-256-GCM 封存、refresh、backchannel logout | `backends/src/identity.ts`、`security.ts`、迁移 `001` | 新增 |
| C5 | 通知：新评论/回复/审核删除/新文章/文章更新，签名调用 SM 邮件队列，事件去重 | `backends/src/mail.ts`、`app.ts#notifyComment` | 新增 |
| C6 | 阅读统计：`visitor_key`/`ip_hash` 双键 3h 去重、advisory lock、聚合查询、SM 管理端签名报表 | `app.ts`、迁移 `008_analytics.sql` | 新增 |
| C7 | 反滥用：全局 100/min + 评论 8/min + 浏览 30/min、非 GET 请求强制 Origin 白名单、客户端 UUID 幂等、`version` 乐观锁 | `app.ts` | 新增 |
| D1 | 静态站↔后端边界：构建零依赖后端，运行时失败即降级（Try again / "—" / 登录引导） | `Comments/AuthButton/ArticleStats/NotificationLink/account` | 设计点 |
| D2 | QQ/微信分享图管线 | `utils/renderQqImage.ts`、`pages/qq.png.ts`、`posts/[...slug]/qq.png.ts`、`pages/fonts/[weight].ttf.ts` | 新增 |
| D3 | 内容发布通知：`.githooks/{post-commit,post-merge}` + `scripts/git-content-notify.mjs` + `.github/workflows/content-notify.yml` | 提交信息含 `[notify]` 才发送，`notify: false` 抑制 | 新增 |
| D4 | 站点规格文档 | `docs/comments-and-account.md`（含验收清单）、`backends/README.md`、`sources.md` | 新增 |
| D5 | 部署：`backends/{Dockerfile,compose.yml}`（只读根、cap_drop、192 MB 上限、健康检查）、`edgeone.json` 裸域 301 | — | 新增 |
| E1 | 内容替换：删除上游 18 篇文章（文档/示例/发布说明/配色方案），改为 6 篇个人文章 + `about.mdx` | `src/content/posts/*` | 改写 |

**规模**：新增文件约 2.4k 行前端 + 1.3k 行后端 TS + 8 份迁移；`global.css` 从 39 行涨到 833 行；`Footer.astro` 30→198 行；`Header.astro` 226→289 行。

---

## 3. 设计与适配分析

### 3.1 适配得最好的三处

**(1) View Transitions 生命周期（上游最容易出错的地方）**
分叉在每个注入脚本里都做了三件事：用 `WeakSet`/`Map` 防止重复绑定（`theme.ts`、`Header.initNav`、`AuthButton`），在 `astro:before-swap` 里统一 abort + 解绑（`Comments.astro` 的 `mounted` Map、`post-scroll.ts` 的 `cleanup()`），在 `astro:page-load` 重新初始化。`Layout.astro` 还额外在处理"视口外的共享元素不参与转场动画"，`Header` 加了 `transition:persist`。这些正是上游 `theme.ts`/`BackToTopButton` 里没有考虑的场景——分叉把脚本从 `is:inline` 内联改成模块化并补齐了清理逻辑。

**(2) 评论/账户在"静态站 + 外部服务"约束下的降级设计**
`scripts/blog-api.ts` 统一 15s 超时、`Retry-After` 解析、错误分类（http/network/timeout/response），把 HTTP 状态、API error code、超时、CORS 失败都翻译成可读文案。`AuthButton` 还做了 30s 身份缓存 + 429 退避（`retryAfterMs`），避免页面每个区块都打 `/auth/me`。后端不可用时：评论区给 `Try again`、统计保持 `—`、`NotificationLink` 退化为登录链接、账户页给一次性提示——静态站可用性没有被后端绑架，这与上游"纯静态、可部署到任意 CDN"的定位是兼容的。

**(3) 内容管线改造的顺序与互斥**
`markdown.processor` 从 `[remarkToc, remarkCollapse]` 换成 `[remarkMath, remarkDisplayMath]` + `[rehypeCallouts, rehypeKatex, rehypeEmoji, rehypeImageCaptions]`：
- `remarkDisplayMath` 通过 `position.offset` 回读源码判断 `$$…$$`，把行内公式"提级"为块级，绕开 `remark-math` 对行内 `$$` 的限制，实现干净；
- `rehypeEmoji` 与 `rehypeImageCaptions` 通过 `className.includes("emoji-inline")` 互斥，表情不会被包成 `figure`；
- 表情替换走 AST（`utils/emoji.ts`），与评论端 `TreeWalker` + `code/pre` 排除保持同一语义。

### 3.2 适配中的四处明显偏离——也是我认为最值得改的地方

**(1) 完全绕过上游 v6 的「类型化配置层」**

`src/types/config.ts` 与上游**逐字节相同**，`astro-paper.config.ts` 只改了取值。也就是说，分叉新增的"可能因站点而异"的东西全部是字面量：

| 内容 | 位置 | 现状 |
| --- | --- | --- |
| 后端 API 源 | 7 个文件重复 `import.meta.env.PUBLIC_BLOG_API ?? "https://api.loopo.cc"` | 未进 `env` schema，未集中 |
| 品牌名 | `backends/src/mail.ts:1` `const brand = "Loopo:443"`、`account.astro` 标题字符串 | 硬编码，改站名要改多处 |
| 上线时间 | `Footer.astro` `uptimeStartedAt = "2026-09-29T14:33:19+08:00"` | 硬编码 |
| 安全设置入口 | `account.astro` `"https://auth.loopo.cc/sign-in"` | 硬编码，且与后端 `SITE_ISSUER` 重复 |
| 备案号/许可 | `Footer.astro` | 硬编码（可接受，站点专属） |
| 表情分组定义 | `scripts/generate-emoji-manifest.mjs` 内联 8 组 | 硬编码（可接受，但注释稀缺） |
| HotLinks | `src/data/hotlinks.json` | ✅ 独立数据文件，是唯一"配置化"的新功能 |

后果：任何想复用这套分叉的人必须改源码。这既不符合上游 README 宣传的 "highly customizable"，也让分叉更难跟上上游 v6 的配置化重构。

**(2) i18n 层只做了一半**

`src/i18n/lang/en.ts` 只加了 3 个 key（`post.tableOfContents`、`home.hotLinks`、`footer.allRightsReversed`），而新增的 C 组功能全部是硬编码英文标签（`Leave a comment`、`Write`/`Preview`/`Send`、`Account`、`Notifications`、`Security`、`Emoji`、`Loading comments…`）与硬编码中文/日文内容（默认占位符 `写下你的想法，和读者交流一下吧。`、`public/comments/placeholders.json` 的日文歌词、邮件 `fromName` 用「评论通知/回复通知/文章更新通知」）。更微妙的是 `footer.allRightsReversed` 这个 key 现在**没有任何引用**（页脚改成了 CC-BY-NC 那一行），属于死键。英文 UI + 中文正文 + 日文占位是本站刻意的气质，但应该由 i18n 层显式表达，而不是散落在组件里。

**(3) CSS 组织与上游惯例不符**

上游把样式放在各组件的 `<style>` 中，`global.css` 只有 39 行工具类；分叉往 `global.css` 塞了约 790 行（`.comments-*`、`.emoji-*`、`.account-*`、`.post-footer-*`、`.article-stats`…）。同一文件里还留着已无人使用的 `.comments-kicker`（`dev-notes.mdx` 恰好吐槽过"小标题+大标题"这套 UI，但 CSS 没删）。这是"能跑"和"可维护"之间的典型取舍：功能集中在 1–2 个组件（`Comments.astro` 833 行 + `global.css`）更省事，但上游升级时冲突面更大。

**(4) 后端代码风格与仓库其它部分割裂**

`.prettierignore` 只格式化 `src/`、`public/`、`.github/`，因此 `backends/src/*.ts` 不在 Prettier 管辖内，写成极限压缩风格（`server.ts` 38 行塞进整个启动流程、`identity.ts` 单行 300+ 字符的路由定义），并夹带中文注释与中文错误串（`throw new Error("BFF schema 或密钥无效")`）。与上游"每行都过 Prettier"的观感差异很大。功能上没问题，但作为公开分叉，读者会感到是两个作者两种风格。

### 3.3 边界与契约设计（值得单独记录）

- **SM 的关系**：分叉明确"博客不读 SM 的库表"，只通过 OIDC（`auth.loopo.cc`）+ 两条签名命令通道交互（`/internal/site-mail`、`BLOG_ANALYTICS_URL`）。`backends/register-sm.sh` 负责在 SM 侧注册服务并打印一次性凭据。边界清晰，但 SM 不在本仓库，契约只存在于文档描述（无 OpenAPI/JSON Schema 共享），后续演进存在漂移风险。
- **签名命令通道**：`validCommandSignature` 使用 `HMAC-SHA256(eventId.timestamp.body)` + 5 分钟时间窗 + `timingSafeEqual`，邮件事件 ID 为 `event_id:recipient`、内容通知为 `commit:file`，天然支持 SM 侧去重。设计克制且正确。
- **数据面**：`GET /blog/analytics`、`GET /blog/comments` 是匿名只读接口；`POST /blog/analytics/view` 匿名可写但被 3 小时窗口 + advisory lock 限制。所有写操作强制 Origin 白名单（`api` 插件 `onRequest`）。
- **迁移所有权**：`site_blog` schema 自持，`003_grants.sql` 明确"API 角色不得获得 auth/core 权限"，`007` 还删掉了早期的站点级总开关——看得出经历过一轮收敛。

### 3.4 值得记录的瑕疵（非阻塞）

| 位置 | 问题 | 影响 |
| --- | --- | --- |
| `Footer.astro` 统计脚本（§7 部分缓解：请求改为并发，仍未合并为单次聚合查询） | 评论总数是**按文章一篇一次请求**（N+1），且 `cache: "no-store"` | 现在 5 篇文章=6 次请求；文章变多会明显拖慢页脚 |
| ~~`account.astro`~~（§7 已修复：改用 `requestBlogApi` + 保存反馈） | `update()` 不检查 `response.ok`，保存没有成功/失败反馈；`Origin` 头手写（浏览器会忽略） | 静默失败，与评论区细致错误处理风格不一致 |
| `Comments.astro` | 删除确认用 `confirm()`；列表渲染用字符串模板 + 手写 `escape` 拼 `innerHTML` | 与其"现代度"定位略不匹配（同一文件里表情渲染却用了 DOM API） |
| ~~`backend` `server.ts`~~（§7 已改为 `TRUST_PROXY` 环境变量） | `trustProxy: ["172.30.0.2/32"]` 硬编码 Docker 对端 IP | 网关 IP 变化会把所有访客算成同一 IP（退化为全局 100/min 限流） |
| ~~`backends`~~（§7.9 已补：`node:test` 用例 + backends CI job；迁移仍靠手工按文件名顺序执行） | 无任何测试；无后端 CI；迁移靠手工按文件名顺序执行 | 回归风险集中在人工验收清单 |
| ~~`package.json`~~（§7 已移除） | `better-auth`、`gsap`、`optional` 三个依赖无任何引用 | 安装体积与安全扫描噪音（`gsap` 3.15 是 2026 年较新的包，但确实没用） |
| ~~`sitemap`~~（§7 已排除） | 包含 `/account/` | 用户私有页被索引 |
| `astro-paper.config.ts` | `shareLinks` 的 QQ 分享用 `http://connect.qq.com/...` | 历史遗留协议，无功能影响 |
| ~~`README.md`~~（§7 已重写） | 「Documentation」四个链接指向本仓库已删除的文章；「Running Locally」仍教用户 `create astro --template satnaing/astro-paper`（拿到的是没有这些功能的上游）；无根级 `.env.example` | 新读者第一步就会断 |

---

## 4. 三维评价

### 4.1 完整性：4.0 → 4.5 / 5（修复后）

**做得好的**
- 功能是**闭环**而非半成品：评论的编辑/删除/回复/权限（服务端 `can_edit`/`can_delete` + 客户端 UI）、通知的开关矩阵（全局 / 自动订阅 / 内容通知）、统计的去重与报表、内容通知的双通道（本地 hook + Actions），每一条都能在 `docs/comments-and-account.md` 的验收清单里找到对应项。
- **构建可复现**：`astro check`（类型）+ `astro build` + `pagefind` 全绿；后端 `tsc --noEmit` 0 error 且能产出 `dist`。
- **清单类产物有防错**：表情生成器在目录冲突、标识重复、子目录存在时直接抛错，且我实测重跑结果与仓库内清单逐字节一致。
- **文档密度高**：`docs/comments-and-account.md` 覆盖了通知规则、生命周期失败模式、邮件集成、验收清单，`backends/README.md` 覆盖了注册/迁移/环境变量——这在个人项目里相当罕见。

**缺口（按严重度）**
1. ~~**CI 是红的**~~（§7 已修复）：初评时 `pnpm run lint` 报 8 个 error（`scripts/*.mjs` 的 `no-console` + `src/pages/index.astro:51` 的解析错误 `Unexpected token. Did you mean {'>'}?`——hero 标题开头那个 `>` 在 eslint-plugin-astro 的解析器里炸了，虽然 `astro build` 渲染正确）；`pnpm run format:check` 有 7 个文件未格式化。上游同样命令通过，因此这是分叉引入的。这两项直接决定了初评不给"完整性"满分。
2. ~~**文档/元数据未同步**~~（§7 已修复）：README 四处断链、运行指引指向上游模板、CHANGELOG 与上游逐字节相同（没有任何分叉条目）、`astro-paper.config.ts` 的配置项说明缺席、新增环境变量（`PUBLIC_BLOG_API`、`PUBLIC_COMMENTS_DEBUG`）既未进 `env` schema 也未进任何 `.env.example`。
3. ~~**零自动化测试**~~（§7.9 已起步）：现在有 8 个 `node:test` 用例覆盖 `security.ts` 与计数接口，并进了 CI；但整体覆盖率仍低——鉴权、发信、迁移、前端组件都没有测试，`backends/scripts/comments-load.mjs` 仍只是人工压测脚本。
4. ~~**文档与实现漂移**~~（§7 已修复）：规格文档说评论标题是 `DISCUSSION`，代码是 `Leave a comment`；`.comments-kicker`、`allRightsReversed` 是死代码/死键。

### 4.2 现代性：4.5 / 5

**明确站在 2026 年前沿的部分**
- **框架/工具**：Astro 7（`unified` processor、`astro:assets` 字体 API、`experimental_getFontFileURL`、`svgoOptimizer`）、Tailwind v4（`@theme inline`、`@utility`、`@custom-variant dark`、无 `tailwind.config`）、TypeScript 6、pnpm 12、ESLint 10、Prettier 3 + `prettier-plugin-tailwindcss`。
- **平台能力**：View Transitions + `transition:persist` + 共享元素命名（`post-*`、`tag-*`）；`100dvh`；CSS `color-mix()`；`inert`（非当前表情分组的 tabpanel 真正不可聚焦）；`mask-image` 做下划线擦除动画；`scroll-snap-type: x mandatory` + `overscroll-behavior` 做触屏表情分页；`prefers-reduced-motion` 在侧栏、滚动行为、lightbox 三处落地；`ResizeObserver`；`AbortSignal.any()`/`AbortSignal.timeout()`；`crypto.randomUUID()`。
- **后端**：Fastify 5 + JSON Schema 校验（`additionalProperties: false`、正则约束、上限值）+ `@fastify/rate-limit` + CORS 白名单 + `@fastify/cors` credentials；`openid-client` v6 + `jose` 做 OIDC PKCE 与 backchannel logout；AES-256-GCM 自封存 token；Postgres `pg_advisory_xact_lock` + `ON CONFLICT ... WHERE` 原子去重；`tsx watch` 开发、多阶段 Dockerfile（`npm prune --omit=dev`）、`compose.yml` 的 `read_only` + `cap_drop: [ALL]` + `no-new-privileges` + `mem_limit` + healthcheck；GitHub Actions 用 `node --env-file-if-exists` 与最小权限（`permissions: contents: read`）。
- **前端工程**：统一 API 客户端（超时/退避/错误分类）、`Intl.NumberFormat` 紧凑计数、`aria-live`、tablist 键盘方向键、dialog 焦点陷阱、`sr-only` 文案齐全。

**残留的"上一代"痕迹**
- `confirm()` 删除确认、大量 `innerHTML` 字符串拼接 + 手写 `escape`（`Comments.astro`/`account.astro`）——现代 Astro 项目通常会选 islands（Preact/Svelte）或至少 DOM API 构建节点（作者本人在表情渲染里用了 DOM API，风格不统一）。
- `account.astro` 完全不使用统一的 `requestBlogApi`，退化为裸 `fetch` 且不校验状态。
- 没有使用内容集合的 `reference()`/`live collections`；`getStaticPaths` 仍是全量遍历（无 `astro:content` 增量考虑）。
- 部署拓扑没有文档化：上游 README 写的是 Cloudflare Pages，分叉同时存在 `edgeone.json`（边缘重定向）与 Docker 化的 `backends/`，读者无法从仓库判断生产拓扑（静态站落在哪、反代在哪、SM 在哪）。

### 4.3 风格吻合度：4.0 / 5

**视觉：高度吻合，且有超出（子分 4.5）**
- 复用了上游全部设计令牌（`--background/--foreground/--accent/--muted/--border`），新增的唯一色板是 `--color-highlight #39c5bb` 与 `--highlight-text`（浅/深各一档），使用范围克制（目录当前项、高亮标签）。
- "虚线"语言被扩展而非替换：`.comments { border-top: 1px dashed }`、`.comment-submit { border: 1px dashed var(--accent) }`、`.comments-error { border: 1px dashed }`、`figure` 说明文字、备案链接 `decoration-dashed`——和上游 `hr.border-dashed`、`active-nav`/`LinkButton` 的虚线同源。
- 焦点态统一为 `2px dashed accent`（`.emoji-trigger/.emoji-tab/.emoji-item:focus-visible` 与全局 `outline-dashed` 一致）；键盘可用性、`sr-only`、`aria-*` 与上游同等标准。
- 字体策略甚至比上游更讲究：上游用 Google provider 拉到 5 字重，分叉改为本地 ttf/woff（国内可达）+ CJK 字栈（`Noto Sans SC Variable → Noto Sans SC → Source Han Sans SC → Microsoft YaHei`），并把 OG 图字体换成带 CJK 的本地字体，`--text-*` 尺度整体上调（base 17px）以适配中文阅读。
- 两处**超出上游**的细节：`theme-color` 随主题/转场同步；导航下划线从"渐入渐出"改成"书写/擦除"的 SVG 遮罩动画（并处理"擦除中再次进入"需要延后两帧的边界）。

**交互一致性的小裂痕**
- 上游 Tag 是 `border-b-2 border-dashed` + hover 上移；分叉的高亮标签变成波浪下划线 `#tag` + 上标计数，普通标签样式不变——同屏出现两种标签语言（可辩护为"当前文章标签"的特例，但需要设计意图说明）。
- 文章底部布局被重排：`ShareLinks` 从"prev/next 网格里的一格"移到 `AdjacentPostNav` 的插槽，用 `post-footer-layout--both/prev-only/next-only/empty` 四种网格处理缺位，桌面 3 列、移动端 share 独占一行。逻辑比上游严谨（上游只有 `sm:col-start-2`），但视觉上把分享区放到了 prev/next 之间，属于对上游版式的改写。

**工程风格：偏离最明显（子分 3.0）**
- 新增功能零配置面（§3.2.1）、i18n 只做一半（§3.2.2）、790 行 CSS 进全局（§3.2.3）、后端不走 Prettier 且中英混排（§3.2.4）。
- 内容层面：删除了上游的 18 篇文章（含 `how-to-*`、`dynamic-og-images`、`predefined-color-schemes`、五篇 release notes、`examples/` 四篇），但 README 仍在引用它们——"上游文档即主题手册"这一约定被打破，却没有替代品（新写的 `docs/comments-and-account.md` 是规格而非使用手册）。
- 代码里的注释语言混杂（`// 视口外的共享元素不参与本次位移动画`、`// 使用站点迁移角色执行`），在英文注释为主的上游里显得突兀——不过这是个人分叉的可接受选择。

---

## 5. 建议清单

### P0（半小时内可修，直接影响 CI/可信度）—— ✅ 已全部完成，见 §7
1. `pnpm format` 后提交，让 `format:check` 通过（7 个文件）。
2. `eslint.config.js` 为 `scripts/**`、`backends/scripts/**` 放开 `no-console`；`src/pages/index.astro` 的 hero 标题开头那个 `>` 包成 `{">"} ` 或改用 `&gt;`，消除 eslint-plugin-astro 的解析错误（`astro build` 本身能正确渲染，属于解析器差异）。
3. 修 README 的四处断链（改为指向自己的 `docs/` 或上游线上文档），把 "Running Locally" 换成 `git clone` 本仓库 + `PUBLIC_BLOG_API` 说明，并补一份根级 `.env.example`。

### P1（结构性，但收益明确）—— 全部完成，见 §7
4. 把散落的常量收敛成配置：`astro-paper.config.ts` 增加 `comments: { apiUrl }`、`site.brand/uptime/securityUrl` 之类的字段（`src/types/config.ts` 同步扩展），或至少把 `PUBLIC_BLOG_API` 提升为 `astro:env` schema 字段并集中到一个 `src/lib/blogApi.ts`。
5. 给新增 UI 文案补 i18n key（含中文/日文占位符与邮件发件名），顺手删掉死键 `allRightsReversed` 与死 CSS `.comments-kicker`。
6. 让 `account.astro` 复用 `requestBlogApi` 并给出保存反馈；统计页脚改成一次批量请求（评论数改用 `EXISTS`/聚合端点），去掉 N+1。
7. ✅ 加最小测试与 CI：后端加一个 `vitest`/`node:test` 对 `security.ts`（seal/unseal、签名校验）与 `app.ts`（用 `fastify.inject` + 内存 pg mock）的用例；`.github/workflows/ci.yml` 增加 backends job（`npm ci && npm run check && npm test`）与 `node scripts/generate-emoji-manifest.mjs && git diff --exit-code` 的清单一致性校验。
8. 后端 `trustProxy` 改为从环境变量读取（`TRUST_PROXY`），避免硬编码网关 IP。

### P2（长期/可选）
9. 与上游保持可合并性：恢复上游文章或用 `upstream` remote 定期 rebase（当前仓库只有 1 个 squash commit + 一条 "feat: redirect @ to www"，无法用 `git log` 回溯分叉历史，也无法 cherry-pick 上游修复）。
10. 把 `backends/` 的代码风格纳入 Prettier（或单独一个 `backends/.prettierrc`），并统一注释语言。
11. 评论/账户的 DOM 渲染迁移到 islands 或至少一个 `el()` 辅助函数，去掉 `confirm()`、`innerHTML` 字符串模板与手写转义。
12. 若长期维护：为 SM 交互补一份接口契约（哪怕是把 `resource.json` + 邮件 payload 抽成 TS 类型共享包），并给 `/account/` 加 `noindex`。
13. 清理未使用依赖（`better-auth`、`gsap`、`optional`），`CHANGELOG.md` 要么重写为分叉日志，要么从仓库移除以免误导。

---

## 6. 附录

### 6.1 关键新增文件与规模

| 文件 | 行数 | 说明 |
| --- | --- | --- |
| `src/pages/posts/[...slug]/_components/Comments.astro` | 833 | 评论 UI + 表情渲染 + 生命周期 |
| `backends/src/app.ts` | 970 | 评论/账户/通知/统计 API |
| `src/styles/global.css` | 833（上游 39） | 全部新增组件样式 |
| `src/components/PostSidebar.astro` | 383 | 目录 + 标签云 + 滚动摘要 |
| `src/pages/account.astro` | 229 | 账户页 |
| `src/components/AuthButton.astro` | 166 | 身份缓存 / 登录态 UI |
| `src/components/Footer.astro` | 198（上游 30） | 版权/备案/站点统计 |
| `backends/src/{identity,mail,security,server,errors}.ts` | 361 | OIDC BFF、邮件模板、加密、启动 |
| `backends/migrations/*.sql` | 8 份 | 评论→回复→通知→订阅→统计 |
| `scripts/generate-emoji-manifest.mjs` | 175 | 表情重命名 + 清单生成（带冲突检测） |
| `scripts/git-content-notify.mjs` | 91 | 签名内容通知 |
| `docs/comments-and-account.md` | ~200 | 规格 + 验收清单 |

### 6.2 复现命令

```bash
# 上游基线
git clone --depth 1 https://github.com/satnaing/astro-paper /tmp/upstream

# 差异
diff -rq --exclude=.git --exclude=node_modules --exclude=pnpm-lock.yaml /tmp/upstream .

# 静态站：类型检查 + 构建 + 搜索索引
pnpm install --frozen-lockfile && pnpm run build      # ✅ 通过

# 质量门（CI 内容）
pnpm run lint          # ❌ 8 errors
pnpm run format:check  # ❌ 7 files

# 后端（隔离目录，避开沙箱 npm 崩溃）
mkdir -p /tmp/backend-check && cp -r backends/{src,tsconfig.json,package.json} /tmp/backend-check/
cd /tmp/backend-check && pnpm install --ignore-scripts && npx tsc --noEmit   # ✅ 0 error

# 表情清单一致性
node scripts/generate-emoji-manifest.mjs && git status --porcelain public/emoji/manifest.json  # ✅ 无变化

# 实机预览
cd dist && python3 -m http.server 4321 --bind 0.0.0.0
```

> 预览提示：本仓库的静态构建可在沙箱内直接浏览（首页/文章页/账户页均可打开），但 `api.loopo.cc` 的 `FRONTEND_ORIGINS` 不含沙箱预览域，因此评论区、登录按钮与页脚统计会走到"失败降级"分支——这恰好也是 §3.1(2) 降级设计的现场演示。

---

## 7. 修复记录（评审后在同一分支落地）

下列改动均在本分支完成，**未提交到 git**（工作区改动），每一项都用命令复核过。

### 7.1 CI 恢复绿色

| 改动 | 文件 | 验证 |
| --- | --- | --- |
| hero 标题的 `>` 转义为 `&gt;`，消除 eslint-plugin-astro 解析错误（渲染结果不变） | `src/pages/index.astro` | `pnpm run lint` → 0 error |
| 为构建脚本放开 `no-console`（`scripts/**`、`backends/scripts/**`），规则顺序放在通用规则之后 | `eslint.config.js` | 同上 |
| 全仓库 Prettier 格式化 | 7 个文件 | `pnpm run format:check` → "All matched files use Prettier code style!" |

### 7.2 配置与环境变量收敛

- `astro.config.ts` 的 `env.schema` 新增 `PUBLIC_BLOG_API`（默认 `https://api.loopo.cc`）与 `PUBLIC_COMMENTS_DEBUG`（布尔，默认 `false`）。
- `src/scripts/blog-api.ts` 现在导出 `blogApiOrigin` / `commentsDebug`，原先散落在 **6 个组件** 里的 `import.meta.env.PUBLIC_BLOG_API ?? "https://api.loopo.cc"` 全部改为引用这一处。
- 新增根级 `.env.example`；README 增加「Environment variables」表。
- 新增 `site.securityUrl` 配置项（`src/types/config.ts`、`src/config.ts`、`astro-paper.config.ts`），账户页的安全设置链接改为读取它，未配置时整段隐藏。
- 移除未使用依赖：`better-auth`、`gsap`、`optional`（`pnpm remove`，锁文件同步）。
- 验证：`PUBLIC_BLOG_API=https://api.example.test PUBLIC_COMMENTS_DEBUG=true pnpm exec astro build` → 产物中 `data-comments-api`、`data-auth-me`、`data-comments-debug` 全部随环境变量改变；不带变量构建时回落默认值。

### 7.3 i18n 补全与死代码清理

- `src/i18n/types.ts` + `src/i18n/lang/en.ts` 新增 `comments`（含 `emoji` 子组）、`account`、`footer.stats`、`post.views` 等 key，共约 40 条；删除死键 `footer.allRightsReversed`。
- `Comments.astro`、`EmojiPicker.astro`、`Account`、`ArticleStats.astro`、`NotificationLink.astro`、`Footer.astro` 的全部可见文案（含客户端脚本运行时用到的字符串，通过 `data-labels` 序列化传递）改为读取 i18n。
- 删除死 CSS `.comments-kicker`。
- 新增 `.account-feedback` 样式，用于账户页的保存反馈。

### 7.4 账户页交互补齐

- 账户页脚本改用统一的 `requestBlogApi`（15s 超时、错误分类、`Retry-After`），不再裸 `fetch`，并去掉手写的 `Origin` 头。
- 「Save changes」现在有成功/失败反馈（`role="status"` 的反馈行），通知开关失败会回显错误；取消订阅按钮有禁用态与错误提示。
- 规格文档中 `DISCUSSION` 与实现的漂移已改正。

### 7.5 后端与部署

- `backends/src/app.ts` 的 `trustProxy` 改为可选配置项，`server.ts` 从 `TRUST_PROXY` 环境变量读取（默认仍是 compose ingress 的 `172.30.0.2/32`）；`backends/.env.example` 与 `backends/README.md` 同步说明。
- 验证：隔离副本 `pnpm install && npx tsc --noEmit && npx tsc -p tsconfig.json` → 0 error，且 `dist/server.js` 中含 `TRUST_PROXY` 读取逻辑。

### 7.6 文档

- README：增加分叉说明与功能清单条目、目录结构（`backends/`、`docs/`、`src/data/`、`scripts/`、`.githooks/`）、环境变量表、`emoji:generate`/`emoji:rename`/`hooks:install` 命令；「Documentation」改为上游线上文档 + 本仓库 `docs/`；「Running Locally」改为 clone 本仓库。
- CHANGELOG：新增「Fork — Loopo:443 (unreleased)」段落，保留上游历史（不再与上游逐字节相同）。
- `docs/comments-and-account.md`：评论标题与 i18n 的说明同步到实现。

### 7.7 仍未处理（有意保留）

| 项 | 原因 / 建议 |
| --- | --- |
| ~~页脚评论数的 N+1~~（§7.9 已修复） | 新增 `GET /blog/comments/counts?posts=…` 聚合接口（一次查询 `GROUP BY post_slug`），页脚改为**单次请求**，与已在用的 `/blog/analytics` 批量接口对称 |
| 评论/账户的 DOM 渲染方式 | `confirm()`、字符串模板拼接仍是工作量大且易回归的重构，建议单独一个 PR |
| 与上游的可合并性 | 本仓库历史是 squash 过的单提交，"恢复到可 rebase 上游"需要重建历史，风险高于收益，交由仓库所有者决定 |
| 部署拓扑文档化 | `edgeone.json` + Docker 反代的实际拓扑只有站点所有者清楚，报告只能指出缺口 |

### 7.8 本轮复核命令与结果

```bash
corepack pnpm run lint          # ✅ 0 error（此前 8）
corepack pnpm run format:check  # ✅ All matched files use Prettier code style!
corepack pnpm run build         # ✅ astro check + 24 页 + pagefind（5 pages indexed）
PUBLIC_BLOG_API=… astro build   # ✅ 环境变量生效，产物随之改变
# 后端（/tmp 隔离副本）
npx tsc --noEmit                # ✅ 0 error
node scripts/generate-emoji-manifest.mjs && git status --porcelain public/emoji/manifest.json  # ✅ 无差异
curl（静态预览）                 # ✅ /、/posts/dev-notes/、/account/、/og.png、/qq.png、/posts/dev-notes/qq.png 均 200
```

### 7.9 第二轮：聚合接口、测试与后端 CI

| 项 | 改动 | 验证 |
| --- | --- | --- |
| 页脚评论数 N+1 | `backends/src/app.ts` 新增 `GET /blog/comments/counts?posts=a,b,c`（单条 `GROUP BY post_slug` 聚合查询，≤100 个 slug，对未知 slug 补 0，仅统计未删除评论）；`Footer.astro` 由「每篇文章一次 `/blog/comments`」改为**一次**调用该接口，请求总数从 N+1 降到 2（统计 + 点赞数） | 构建后 `dist/_astro/Footer.*.js` 中只剩 `blog/comments/counts`；`blog/comments?post=` 只出现在文章页评论区（本就该按文章取） |
| 后端测试 | 新增 `backends/test/security.test.ts`（seal/unseal 往返、每次密文不同、错密钥与篡改拒绝、webhook 签名窗口/格式/错密钥）与 `backends/test/comments-counts.test.ts`（用 stub `pg.Pool` + `app.inject` 验证批量、去重、零填充、400 分支） | `npm test` → 8 pass / 0 fail；`npm run check`（`tsconfig.test.json`，覆盖 `src/` + `test/`）0 error |
| 后端 CI | `.github/workflows/ci.yml` 新增 `backend` job：`npm ci` → `npm run check` → `npm test`（Node 24，缓存 `backends/package-lock.json`） | 工作流语法与步骤与本地命令逐一对应；本沙箱 `npm ci` 因 npm 自身缺陷失败，改用等版本 pnpm 安装验证（`fastify 5.12.3` / `pg 8.23.0` / `tsx 4.23.13` / `typescript 5.9.3` 与 lock 完全一致） |
| 文档 | `backends/README.md` 增加 Tests 一节与新接口说明 | — |

生产镜像不受影响：`Dockerfile` 走 `npm run build`（`tsconfig.json` 只含 `src/`），测试目录不进入 `dist/`。
