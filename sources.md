# 参考来源

- [Bangumi API 文档](https://bangumi.github.io/api/#/)及其 [OpenAPI 定义](https://bangumi.github.io/api/dist.json)：核对作品字段、用户身份、收藏状态、评分分布与认证要求，文档版本为 2026-07-24。
- [Bangumi User Agent 说明](https://github.com/bangumi/api/blob/master/docs-raw/user%20agent.md)：服务端请求使用开发者 ID、应用名和项目链接。
- [Bangumi 官方标识精灵图](https://bgm.tv/img/rc3/bg_musume_2x.png)：保存到 `public/images/bangumi-logo.png`，按页面提供的背景定位显示。
- [作品 229343](https://bangumi.tv/subject/229343)：组件接入及真实内容验证使用的作品。

## Bangumi API 文档索引

以下按公开 OpenAPI 的接口分组保留完整功能索引。

### 每日放送

- 每日放送。

### 搜索

- 条目搜索、角色搜索、人物搜索。

### 条目

- 浏览条目、获取条目、获取条目图片、获取关联人物、获取关联角色、获取关联条目。

### 章节

- 获取章节列表、获取单个章节。

### 角色

- 获取角色详情、获取角色图片、获取关联条目、获取关联人物、收藏角色、取消收藏角色。

### 人物

- 获取人物详情、获取人物图片、获取关联条目、获取关联角色、收藏人物、取消收藏人物。

### 用户

- 按用户名获取用户、获取用户头像、获取令牌所属用户。

### 收藏

- 获取用户收藏、获取单个条目收藏、新增或修改单个条目收藏、局部修改收藏。
- 获取及修改条目的章节收藏、获取及更新单个章节收藏。
- 获取角色收藏列表、获取单个角色收藏、获取人物收藏列表、获取单个人物收藏。

### 修订

- 获取人物修订列表及详情、获取角色修订列表及详情、获取条目修订列表及详情、获取章节修订列表及详情。

### 目录

- 创建目录、获取目录、修改目录资料、获取目录条目、添加目录条目、修改目录条目、删除目录条目、收藏目录、取消收藏目录。

### 数据结构

- 作品类型、书籍分类、动画分类、游戏分类、三次元分类、图片、维基信息、评分统计、收藏类型、章节类型、用户组、分页、关联条目、关联人物、关联角色、修订与错误详情。

## 其他参考来源

- [Google Sans Code 国内镜像样式表](https://fonts.loli.net/css2?family=Google+Sans+Code:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap)：页面字体由国内镜像提供。
- [Google Sans Code 字体文件镜像](https://gstatic.loli.net/s/googlesanscode/v20/pxihyogzv91QhV44Z_GQBHsGf5PuckJMZfIVTPZaiXEp_ht12EVEHsN1sCQNcmTVsw.ttf)：OG 图片使用本地留存的常规与粗体字重文件。
- [Astro 本地字体提供器](https://docs.astro.build/en/reference/font-provider-reference/#local)：OG 图片生成沿用 Astro 字体数据接口。
- [Fontsource Noto Sans SC](https://fontsource.org/fonts/noto-sans-sc)：网页使用项目内托管的 Noto Sans SC 字体及 unicode-range 分片。
- [Noto Sans SC npm 包](https://www.npmjs.com/package/@fontsource-variable/noto-sans-sc)：网页字体资源的安装来源。
- [Firefly 使用文档：侧边栏](https://docs-firefly.cuteleaf.cn/zh/guide/sidebar)：确认文章目录和标签云属于可配置侧栏组件，文章目录仅用于文章详情页。
- [Firefly 使用文档：侧边栏小组件](https://docs-firefly.cuteleaf.cn/zh/guide/widgets)：确认标签组件展示文章标签，目录组件使用文章标题。
- [Firefly 使用文档导航](https://docs-firefly.cuteleaf.cn/zh/guide/getting-started)：以下索引按文档导航整理。

## 文档索引

### 入门

- [快速开始](https://docs-firefly.cuteleaf.cn/zh/guide/getting-started)
- [编写文章](https://docs-firefly.cuteleaf.cn/zh/guide/writing)
- [部署指南](https://docs-firefly.cuteleaf.cn/zh/guide/deploy)
- [更新主题](https://docs-firefly.cuteleaf.cn/zh/guide/update)

### 基础配置

- [站点配置](https://docs-firefly.cuteleaf.cn/zh/guide/site)
- [设置面板](https://docs-firefly.cuteleaf.cn/zh/guide/display-settings)
- [个人资料](https://docs-firefly.cuteleaf.cn/zh/guide/profile)
- [背景壁纸](https://docs-firefly.cuteleaf.cn/zh/guide/wallpaper)
- [导航栏](https://docs-firefly.cuteleaf.cn/zh/guide/navbar)
- [侧边栏](https://docs-firefly.cuteleaf.cn/zh/guide/sidebar)
- [侧边栏小组件](https://docs-firefly.cuteleaf.cn/zh/guide/widgets)

### 功能配置

- [字体](https://docs-firefly.cuteleaf.cn/zh/guide/font)
- [代码块](https://docs-firefly.cuteleaf.cn/zh/guide/code-block)
- [评论系统](https://docs-firefly.cuteleaf.cn/zh/guide/comment)
- [封面图片](https://docs-firefly.cuteleaf.cn/zh/guide/cover-image)
- [文章加密](https://docs-firefly.cuteleaf.cn/zh/guide/password)
- [沉浸阅读](https://docs-firefly.cuteleaf.cn/zh/guide/immersive-reading)
- [音乐播放器](https://docs-firefly.cuteleaf.cn/zh/guide/music)
- [Mermaid 图表](https://docs-firefly.cuteleaf.cn/zh/guide/mermaid)
- [PlantUML 图表](https://docs-firefly.cuteleaf.cn/zh/guide/plantuml)

### 页面配置

- [动态](https://docs-firefly.cuteleaf.cn/zh/guide/dynamic)
- [友链](https://docs-firefly.cuteleaf.cn/zh/guide/friends)
- [相册](https://docs-firefly.cuteleaf.cn/zh/guide/gallery)
- [哔哩哔哩](https://docs-firefly.cuteleaf.cn/zh/guide/bilibili)
- [打赏](https://docs-firefly.cuteleaf.cn/zh/guide/sponsor)
- [VNDB](https://docs-firefly.cuteleaf.cn/zh/guide/vndb)
- [MyAnimeList](https://docs-firefly.cuteleaf.cn/zh/guide/myanimelist)
- [番组计划](https://docs-firefly.cuteleaf.cn/zh/guide/bangumi)
- [书签导航](https://docs-firefly.cuteleaf.cn/zh/guide/booknav)
- [项目](https://docs-firefly.cuteleaf.cn/zh/guide/projects)

### 扩展功能

- [特效设置](https://docs-firefly.cuteleaf.cn/zh/guide/effects)
- [公告](https://docs-firefly.cuteleaf.cn/zh/guide/announcement)
- [页脚](https://docs-firefly.cuteleaf.cn/zh/guide/footer)
- [广告](https://docs-firefly.cuteleaf.cn/zh/guide/ad)
- [许可证](https://docs-firefly.cuteleaf.cn/zh/guide/license)
- [Live2D / Spine 模型](https://docs-firefly.cuteleaf.cn/zh/guide/pio)

### 开发者文档

- [首屏闪烁排查](https://docs-firefly.cuteleaf.cn/zh/guide/first-paint-flash.md)
