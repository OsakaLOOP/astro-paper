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
- **Comment notifications**: one global switch and a list of subscribed articles.
  Each row shows the article slug and a `Remove` action. The same subscription
  can also be changed from the article comment editor.

## Comment behavior

The comment heading uses `DISCUSSION`, an English count, and the editor label
`Leave a comment`. The editor has `Preview`, `Write`, and `Send`; Markdown is
rendered with `marked` and sanitized with `DOMPurify` before it reaches the DOM.
The backend stores the original Markdown for editing and notification excerpts.

Each comment can show `Reply`, `Edit`, and `Delete` according to the current user.
Replies are comments with `parent_id`, rendered directly below their parent with a
small indentation and a visible `Replying to a comment above` context. Visual
indentation is capped at three levels; deeper replies keep their real parent but
stay aligned with the third level.

Deleted comments are hard-redacted in place: the body is cleared at deletion time.
Ordinary readers receive no deleted row at all. The author can delete their own
comment. An SM admin can delete any comment. Admins may see the redacted row and
its metadata in their moderation view, but never recover its body.

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

The article comment control is `Email me about new comments on this article`.
Submitting a comment enables the article subscription only when the user opts in;
the user can change it in the article section or in `/account`.

When notifications are globally enabled, a new comment is sent once to:

- the site author/admin, for every article;
- users subscribed to that article, excluding the commenter;
- users whose parent comment is directly replied to, even if they have not enabled
  the article subscription.

When an admin deletes another user's comment, the affected commenter receives a
separate deletion notice. Deletion notices are never sent for self-deletion and do
not expose the deleted body. A notification is queued once per recipient and event
through SM's existing mail worker. Failed delivery is retried by SM.

The global switch is admin-only and stored by the blog service. It defaults to on,
is available in the account admin view, and is enforced server-side for every
notification event.

## SM mail integration

The blog service sends a signed service request to SM's internal mail endpoint. SM
validates the service secret, calls the existing `Jobs.mail` queue, and never gives
the blog service SMTP credentials. The request contains recipient, subject, text,
HTML, event id, and a five-minute timestamp window. The blog service retries only
transport failures; SM owns delivery retries and Message-ID generation.

## Acceptance checklist

- Header login/profile/logout actions are LinkButton-consistent and keyboard usable.
- `/account` edits the blog display name and manages global/article subscriptions.
- Markdown preview and rendered comments are sanitized.
- Replies render in threads and are persisted with `parent_id`.
- Ordinary readers cannot see deleted rows or deleted content.
- Author self-delete and admin delete-anywhere are enforced server-side.
- New comment, direct reply, and admin deletion events follow the recipient rules.
- Global notification off prevents all new event mail.
- SM mail queue receives signed requests and handles retries.
- Root Astro build and backend typecheck pass.
