# Bangumi 作品卡片

`BangumiCard.astro` 支持书籍、动画、音乐、游戏、三次元及系列或合集条目。卡片展示封面、作品资料、简介、评分分布，以及令牌所属账号的公开收藏状态、个人评分和进度。作品链接和 Bangumi 标识均可点击。

文章使用 `.mdx` 扩展名，在需要的位置插入：

```mdx
import BangumiCard from "@/components/BangumiCard.astro";

<BangumiCard subjectId={229343} />
```

`subjectId` 接受任意作品类型的条目 ID；系列或合集使用其主条目 ID。`title` 可选，用于首次同步前的标题。示例文章为 `src/content/posts/youjyo_sama.mdx`，页面地址保持 `/posts/youjyo_sama/`。

## 后端配置与代理

在 `backends/.env` 配置：

```dotenv
BANGUMI_ACCESS_TOKEN=填写令牌
BANGUMI_TOKEN_EXPIRES_AT=2027-11-08T00:00:00+08:00
HTTPS_PROXY=http://host.docker.internal:10809
HTTP_PROXY=http://host.docker.internal:10809
NO_PROXY=localhost,127.0.0.1,::1,host.docker.internal
```

作品 ID 由文章内的 `<BangumiCard subjectId={229343} />` 配置。公开接口 `GET /blog/bangumi/subjects/:id` 根据组件传入的 ID 获取作品，返回经过筛选的展示字段。私有收藏、邮箱及收藏短评均保留在后端。前端继续通过 `PUBLIC_BLOG_API` 使用现有博客 API 地址。

服务端使用 Node 24 的环境代理支持；npm 启动命令包含 `--use-env-proxy`，Docker 设置 `NODE_USE_ENV_PROXY=1`。容器通过项目已有的 `host.docker.internal:host-gateway` 访问宿主机，代理端口应填写服务器实际端口，且应允许容器网段连接。直接在宿主机启动时可使用 `127.0.0.1:10809`。数据库及其他内网服务地址应加入 `NO_PROXY`。

配置完成后重启博客后端；Docker 部署需重新构建镜像。现有的 `/blog/*` 反向代理规则覆盖作品接口。

## 数据同步与故障处理

在 `backends` 目录执行 `npm run bangumi:sync`，脚本自动读取 MDX 中 `<BangumiCard subjectId={数字} />` 的作品 ID，生成 `src/data/bangumi/<作品ID>.json`，再构建和发布博客。生成文件仅包含公开展示内容，可随文章提交；访问令牌始终保存在 Git 忽略的 `.env` 中。

静态页面直接显示数据快照，浏览器随后请求后端更新。后端正常缓存 30 分钟，同一作品的并发请求共用一次更新。网络故障时使用已有缓存；前端遇到超时、非正常响应或接口不可用时保留文章快照，并显示更新提示。封面加载失败时显示占位内容。

作品资料与收藏状态分别获取。令牌失效时继续获取公开作品信息，收藏状态保留已保存的信息。首次使用新作品时，应先完成同步，确保静态页面具有完整信息。

## 令牌邮件提醒

邮件复用博客已有的 `SM_MAIL_URL`、`SM_MAIL_SECRET` 和 `AUTHOR_EMAIL`。服务启动后及每隔 6 小时检查令牌，无访问流量时同样检查。配置到期日前 14 天开始发送提醒；API 返回 401 或 403 时发送失效提醒。请求作品时发现令牌异常也会触发检查结果通知。

同一种提醒在服务进程内每天最多发送一次，服务重启后重新计时。邮件发送失败后至少间隔一小时再尝试，失败记录进入后端日志。邮件包含令牌更换方法和配置的到期时间，作品卡片只显示简短的数据更新提示。

本次令牌按 2026 年 11 月 8 日创建、365 天有效期，配置到期日为 2027 年 11 月 8 日。更换令牌时同步更新 `BANGUMI_ACCESS_TOKEN` 和 `BANGUMI_TOKEN_EXPIRES_AT`，然后重启服务。
