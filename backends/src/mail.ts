const brand = "Loopo:443";
const font =
  "'Google Sans Code', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, 'Noto Sans SC', 'Microsoft YaHei', monospace";

const esc = (value: string) =>
  value.replace(
    /[&<>"']/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!
  );

const lines = (value: string) => esc(value).replace(/\r\n|\r|\n/g, "<br>");

type Context = { author: string; content: string };

function notificationTemplate(input: {
  title: string;
  url: string;
  action: string;
  content: string;
  author?: string;
  context?: Context;
  linkLabel: string;
}) {
  const { title, url, action, content, author, context, linkLabel } = input;
  const homeUrl = `${new URL(url).origin}/`;
  const accountUrl = new URL("account/#notifications", homeUrl).href;
  const regularFontUrl = new URL("fonts/400.ttf", homeUrl).href;
  const boldFontUrl = new URL("fonts/700.ttf", homeUrl).href;
  const subject = `${brand} · ${action} · ${title}`;
  const preview = [author, content || title]
    .filter(Boolean)
    .join(": ")
    .replace(/\s+/g, " ")
    .slice(0, 160);
  const text = [
    brand,
    `${action} · ${title}`,
    author,
    content,
    context && `In reply to ${context.author}:\n${context.content}`,
    `${linkLabel}: ${url}`,
    `Manage notifications: ${accountUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${esc(subject)}</title>
  <style>
    @font-face {
      font-family: 'Google Sans Code';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url('${regularFontUrl}') format('truetype');
    }
    @font-face {
      font-family: 'Google Sans Code';
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: url('${boldFontUrl}') format('truetype');
    }
    @media (prefers-color-scheme: dark) {
      .mail-background { background-color: #212737 !important; }
      .mail-text { color: #eaedf3 !important; }
      .mail-muted { color: #afb9ca !important; }
      .mail-link { color: #ff6b01 !important; }
      .mail-rule { border-color: #ab4b08 !important; }
    }
    @media screen and (max-width: 480px) {
      .mail-padding { padding: 24px 20px !important; }
      .mail-title { font-size: 22px !important; }
    }
  </style>
</head>
<body class="mail-background mail-text" style="margin:0;padding:0;background-color:#fdfdfd;color:#282728;font-family:${font};font-size:15px;line-height:1.7">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${font}">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;font-family:${font}">
        <tr><td class="mail-padding" style="padding:32px 28px">
          <div class="mail-rule" style="padding-bottom:20px;border-bottom:1px dashed #ece9e9">
            <a class="mail-text" href="${esc(homeUrl)}" style="font-family:${font};font-size:24px;font-weight:700;line-height:1.3;color:#282728;text-decoration:none">${brand}</a>
          </div>
          <p class="mail-muted" style="margin:24px 0 8px;color:#6b7280;font-size:12px">${esc(action)}</p>
          <h1 class="mail-title" style="margin:0 0 20px;font-size:26px;font-weight:700;line-height:1.4;overflow-wrap:anywhere;word-break:break-word"><a class="mail-text" href="${esc(url)}" style="color:#282728;text-decoration:none">${esc(title)}</a></h1>
          ${author ? `<p style="margin:0 0 8px;font-weight:700;overflow-wrap:anywhere;word-break:break-word">${esc(author)}</p>` : ""}
          ${content ? `<p style="margin:0 0 20px;overflow-wrap:anywhere;word-break:break-word">${lines(content)}</p>` : ""}
          ${context ? `<div class="mail-rule mail-muted" style="margin:0 0 20px;padding:0 0 0 16px;border-left:2px solid #ece9e9;color:#6b7280;font-size:13px"><p style="margin:0 0 6px">In reply to ${esc(context.author)}</p><p style="margin:0;overflow-wrap:anywhere;word-break:break-word">${lines(context.content)}</p></div>` : ""}
          <p style="margin:24px 0"><a class="mail-link" href="${esc(url)}" style="color:#006cac;text-decoration:underline;text-underline-offset:4px">${esc(linkLabel)} &rarr;</a></p>
          <div class="mail-rule" style="padding-top:16px;border-top:1px dashed #ece9e9;font-size:12px"><a class="mail-muted" href="${esc(accountUrl)}" style="color:#6b7280;text-decoration:underline;text-underline-offset:3px">Manage notifications</a></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, text, html };
}

export function commentMailTemplate(
  article: string,
  url: string,
  author: string,
  content: string,
  action: "New comment" | "New reply",
  context?: Context
) {
  return notificationTemplate({
    title: article,
    url,
    author,
    content,
    action,
    context,
    linkLabel:
      action === "New reply" ? "Continue conversation" : "Reply in discussion",
  });
}

export function commentRemovedMailTemplate(article: string, url: string) {
  return notificationTemplate({
    title: article,
    url,
    action: "Comment removed",
    content: "A site moderator removed your comment from this discussion.",
    linkLabel: "View discussion",
  });
}

export function contentMailTemplate(
  title: string,
  url: string,
  summary: string,
  action: "New article" | "Article updated"
) {
  return notificationTemplate({
    title,
    url,
    content: summary,
    action,
    linkLabel:
      action === "Article updated" ? "Read updated article" : "Read article",
  });
}
