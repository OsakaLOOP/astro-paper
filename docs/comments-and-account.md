# Comments and account specification

## Scope

The static AstroPaper site keeps its visual language: English labels, the existing
font and theme tokens, dashed links, and compact spacing. SM remains the only
identity provider. The blog API owns comments, subscriptions, and notification
preferences; it never reads SM's database directly.

## Account entry and account page

The header shows a `Log in` LinkButton when signed out. When signed in it shows the
user's display name as a link to `/account` and a compact `Log out` action. The
links use the same hover, focus, dashed underline, and spacing rules as
`LinkButton`; persistent underlines are not used.

`/account` has three short sections:

- **Profile**: a blog display name used for comments, the SM email address, and a
  link to SM security settings. Password and authentication profile changes stay
  in SM; the blog does not copy or modify identity credentials.
- **Notifications**: comment mail, first-comment auto-subscription, and new
  article/content mail, plus a list of subscribed articles.
  Each row shows the article slug and a `Remove` action. The same subscription
  can also be changed from the article comment editor.

## Comment behavior

The comment heading is the `comments.heading` string (`Leave a comment`), the
count uses the `comments.count` template (`{{count}} comments`), and every label
in the section comes from the `comments`/`account` groups in `src/i18n`. The editor has `Preview`, `Write`, and `Send`; Markdown is
rendered with `marked` and sanitized with `DOMPurify` before it reaches the DOM.
The backend stores the original Markdown for editing and notification excerpts.

## Emoji system

评论编辑器提供表情面板。表情资源位于 `public/emoji/<group>/`，每个一级目录
对应一个表情分组，目录名作为面板中的分组名称。当前资源包含 8 个分组、334 个
文件，支持目录中已有的 `png`、`webp`、`gif` 及其他浏览器可显示的栅格格式。

### 资源命名

启用功能前，所有资源先完成一次批量重命名，并为每个资源生成稳定且全局唯一的
文件名。文件名格式为 `<system-id>_<suffix>.<extension>`：

- `system-id` 是表情系列的简短英文或数字标识，例如 `bgmtv`、`2233`、
  `bgmmusume`、`BA`、`PJSK`；
- `suffix` 优先保留原文件名中有辨识度的简短描述，缺少合适描述时从 `01` 开始
  使用两位编号；
- 去除拓展名后的文件名作为评论中的表情标识；
- 批量重命名保留原拓展名和文件字节内容；
- 标识在全部分组内保持唯一，分组信息继续用于生成资源路径和面板分组。

资源重命名由一次性脚本执行，脚本同时负责检查拓展名、目标文件名冲突和标识全局
唯一性。后续新增、删除或重命名资源时，重新执行脚本或等价的清单生成流程；生成
流程遇到冲突直接失败，避免产生不可引用的清单。

仓库静态保存生成后的清单 `public/emoji/manifest.json`。清单属于可审查的构建产物，
使用 UTF-8 JSON，分组和条目均采用确定性排序，结构如下：

```json
{
  "version": 1,
  "groups": [
    {
      "id": "2233",
      "label": "2233",
      "items": [
        {
          "id": "2233_01",
          "src": "/emoji/2233/2233_01.png",
          "alt": "2233 01",
          "type": "png"
        }
      ]
    }
  ]
}
```

资源增加、删除或重命名后必须显式重新生成清单，并将清单与资源变更一起提交。
浏览器在单个页面内只请求一次清单，同时缓存进行中的请求和解析后的结果；面板、
输入替换、预览和评论渲染共享同一份缓存数据。清单请求失败时，编辑器继续提供普通
Markdown 编辑能力，已有评论继续显示。

### 评论语法与渲染

输入 `(2233_01)` 形式的表情标识时，面板将对应资源插入评论正文。数据库继续保存
纯文本标识，便于编辑、通知摘要和服务端校验保持稳定。渲染过程只替换清单中存在的
标识，未知或格式错误的标识保留为普通文本。

渲染后的表情使用统一的最大宽度和最大高度，保持原始比例，并与周围文字基线对齐。
GIF 继续使用普通图片元素，因此预览和评论中的动画保持播放。每张图片具有来自清单
的有效 `alt` 文本；替换结果通过 DOM API 或带白名单的安全 HTML 生成，仅允许本地
`/emoji/` 资源路径和必要的图片属性。

独立的表情标识（例如 `(AC_03)`）与嵌在文字、粗体或链接中的标识使用同一渲染规则；
代码块和行内代码不替换。标识使用资源名中的下划线，不将 `(AC-03)` 等写法作为别名。

### 面板交互

面板位于 `Write`、`Preview` 同一行的右侧，悬浮进入后打开，指针离开后关闭；面板
不设置额外关闭按钮。资源按清单分组显示为标签页，具备可访问名称和完整键盘焦点
路径，支持方向键切换分组。选择资源后，面板在当前光标位置插入标识，并将焦点返回
文本框。标签栏横向滚动，资源区域独立纵向滚动并阻止滚动链传递，在小屏幕上保持在
评论编辑器范围内；触发按钮、标签和资源按钮均提供清晰的焦点状态。

Each comment can show `Reply`, `Edit`, and `Delete` according to the current user.
Replies are comments with `parent_id`, rendered directly below their parent with a
small indentation and a visible `Replying to a comment above` context. Visual
indentation is capped at three levels; deeper replies keep their real parent but
stay aligned with the third level.

Deleted comments are hard-redacted in place: the body is cleared at deletion time.
Ordinary readers receive no deleted row at all. The author can delete their own
comment. An SM admin can delete any comment. Admins may see the redacted row and
its metadata in their admin view, but never recover its body.

## Frontend lifecycle and failures

Astro's `ClientRouter` executes processed component scripts once per browser
session, not once per page visit. Comments therefore mount on `astro:page-load`
(and immediately when their module is first imported), with one mount per section.
`astro:before-swap` aborts the old section's requests and removes its listeners;
the new article mounts with its own slug, state, and login return URL. Cleanup
does not run at `astro:before-preparation`: a failed or cancelled navigation must
leave the current article working.

The header persists across navigation, but refreshes `/blog/auth/me` on each
`astro:page-load`. Its login return URL is the current page, not the first page
visited. The header request and article request are independent: comment
permissions and editor visibility use only `comments.viewer`, never the order
in which `/me` and `/comments` finish. A `/me` 401 is normal signed-out state;
network failures and other statuses are not silently treated as signed out.

Blog requests time out after 15 seconds, including response-body parsing. HTTP
status and API error code, timeout, network/CORS failure, invalid JSON/payload,
and rendering failure are displayed in the relevant frontend area. Loading
failures show a `Try again` button. Navigation cancellation is not displayed as
a service failure. Submit, edit, delete, and subscription failures are visible;
failed submissions retain the draft. Mutations are not automatically retried.

Lifecycle checks should cover direct article entry, home-to-article navigation,
article-to-article navigation, leaving and returning, back/forward history,
navigation while a response is pending, failed navigation, and repeated retries.
Mocking successful API responses should still reproduce the old navigation-only
`Loading` problem; the fixed version must issue a request for every new article
section without duplicating mounts or allowing an old response to update it.

## Notification rules

`/account` keeps three user notification controls under `Notifications`:

- `Email me about comments I follow` is the existing master switch for comment
  mail.
- `Automatically follow an article when I leave my first comment` controls the
  initial state of the article checkbox. It defaults to off, preserving the old
  behavior. An explicit article choice is stored and wins over the default.
- `Email me about new articles and content updates` opts the user into mail sent
  by the signed Git hook endpoint.

The article comment control remains `Email me about new comments on this article`.
Submitting a comment stores the article choice; when no choice exists, the
account default is used. The user can change the article subscription in the
article section or in `/account`.

When notifications are globally enabled, a new comment is sent once to:

- the site author/admin, for every article;
- users subscribed to that article, excluding the commenter;
- users whose parent comment is directly replied to, even if they have not enabled
  the article subscription.

The author of the event is always excluded by both account ID and normalized
email address. This applies to top-level comments, replies to one's own comment,
and cases where the same person is also the site author or an article subscriber.

When an admin deletes another user's comment, the affected commenter receives a
separate deletion notice. Deletion notices are never sent for self-deletion and do
not expose the deleted body. A notification is queued once per recipient and event
through SM's existing mail worker. Failed delivery is retried by SM.

Comment mail is controlled by each user's first setting. Article/content mail is
independently controlled by each user's third setting.

## SM mail integration

All five blog notification types (new comment, reply, moderator removal, new
article, article update) share the Loopo:443 wordmark, AstroPaper colors, dashed
dividers, and a Google Sans Code font stack with monospace and CJK fallbacks.
`/fonts/400.ttf` and `/fonts/700.ttf` expose the existing site font for clients
that support web fonts. Mail clients that block web fonts use the monospace
fallback; allow cross-origin font requests in the static host configuration.
The article title is the main heading; comment submissions optionally provide
`post_title`, with the slug retained as a fallback for older clients. Comment mail
includes the complete comment with line breaks and, for replies, up to 320
characters of the parent comment. Content mail includes the supplied description
without a generic placeholder when it is absent. Both HTML and plain-text mail
for new articles and article updates include a brief GitHub Actions notice that
the site may still be building or deploying and readers can retry shortly.
Both HTML and plain-text mail
link `Manage notifications` to `/account/#notifications` on `PUBLIC_BLOG_ORIGIN`.
Article URLs encode each slug segment separately so nested article paths work.
Each type has its own action label and call to action. Moderator removal notices
do not quote the deleted body or imply that the reader's account was suspended.
Authentication verification and password-reset emails are owned by the separate
SM service, not this blog; SM forwards blog mail without replacing its HTML.

The blog service sends a signed service request to SM's internal mail endpoint. SM
validates the service secret, calls the existing `Jobs.mail` queue, and never gives
the blog service SMTP credentials. The request contains recipient, sender display
name, subject, text, HTML, event id, and a five-minute timestamp window. The sender
display name is used only for blog notifications; authentication emails continue
to use the configured SMTP sender. The blog service retries only transport
failures; SM owns delivery retries and Message-ID generation.

The content endpoint is `POST /blog/hooks/content`. It accepts `new_article` and
`content_update` payloads and requires `X-Site-Command-Timestamp` plus an
`X-Site-Command-Signature` HMAC using `SITE_COMMAND_SECRET`. The tracked
`.githooks/post-commit` and `.githooks/post-merge` hooks inspect changed files
under `src/content/posts`; install them with `npm run hooks:install`. Hooks are
non-blocking: a mail outage is reported to stderr but does not prevent a commit
or merge. Content mail is sent only when the triggering commit message contains
`[notify]`. A post's Front Matter `notify` field suppresses that post when set to
`false`; omitted `notify` defaults to `true`. Front Matter is read from the
committed file, not the working tree, and supports YAML comments and multiline
values.

### GitHub Actions setup

`.github/workflows/content-notify.yml` runs notifications on pushes to `main`
that change files under `src/content/posts`. The job is skipped unless the final
commit message contains `[notify]`, avoiding runner work for ordinary edits. It
does not build the site or wait for deployment; if notification links must already
be live, move the sending step after your deployment succeeds.

In the GitHub repository, open **Settings → Secrets and variables → Actions** and
add these repository secrets:

| Secret | Value |
| --- | --- |
| `BLOG_API_URL` | The API origin, e.g. `https://api.loopo.cc`, without `/blog/hooks/content`. |
| `SITE_COMMAND_SECRET` | The same secret configured on the running blog backend. |

Do not configure a GitHub repository webhook for this endpoint: GitHub's webhook
payload and signature headers differ from the blog's signed command format. No
SMTP credentials, SM mail secret, or backend `.env` file belong in Actions.
The backend must already have `SM_MAIL_URL` and `SM_MAIL_SECRET` configured; the
latter must match SM's `BLOG_MAIL_SECRET`.

Publish an article with a final commit message such as
`docs: publish an article [notify]`. The existing script compares only
`HEAD^..HEAD`: when pushing multiple commits it inspects only the last one. For a
squash or merge commit, include `[notify]` in that resulting commit's message.
Deleted articles do not trigger mail. `notify: false` suppresses an article;
`draft` and future publication dates do not, so suppress those explicitly.

Recipients must enable **Email me about new articles and content updates** in
`/account`; the comment notification switch is independent. The workflow uses
`--strict`, making configuration, diff, and delivery request failures fail the
job, while local Git hooks retain their non-blocking behavior. Successful API
responses, including the recipient count, are printed in the Actions log; they
confirm acceptance by the API and SM queue, not delivery to an inbox. Each content
request times out after 15 seconds. A workflow run has a five-minute time limit.
The commit/file event ID is unchanged when rerunning a failed workflow, allowing
SM's event deduplication to prevent duplicate queue entries.

If local Git hooks are installed as well, the same event may reach the API from
both the local commit and Actions. Both use the same commit/file event ID. To use
only Actions, disable local hooks with `git config --local core.hooksPath /dev/null`
(this disables every Git hook for this clone).

## Acceptance checklist

- Edited comments show the edit icon and latest edit time beside the creation time.
- Article views are stored by the existing local blog API and deduplicated per
  article/IP for three hours; summary counts appear in article lists and posts.
- SM administrators can query article, daily, authenticated-user, and recent
  visit statistics through the signed blog API integration.

- Header login/profile/logout actions are LinkButton-consistent and keyboard usable.
- `/account` edits the blog display name and manages global/article subscriptions.
- Markdown preview and rendered comments are sanitized.
- 表情清单静态存储在仓库中，排序确定，资源变更后可重复生成并通过唯一性校验。
- 每个表情资源均使用唯一的 `<system-id>_<suffix>` 标识，并保留原拓展名和文件字节。
- 面板依据一级目录分组，在文本框当前光标位置插入清单标识。
- 清单中的 `(identifier)` 渲染为统一尺寸范围内的图片，GIF 保持动画，未知标识保留
  为文本。
- 单个页面内只请求并缓存一次清单；请求失败时，普通评论编辑能力继续可用。
- Replies render in threads and are persisted with `parent_id`.
- Ordinary readers cannot see deleted rows or deleted content.
- Author self-delete and admin delete-anywhere are enforced server-side.
- New comment, direct reply, and admin deletion events follow the recipient rules.
- Content notification hooks send only to users who opt in.
- SM mail queue receives signed requests and handles retries.
- Root Astro build and backend typecheck pass.
