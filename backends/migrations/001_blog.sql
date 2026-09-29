-- 使用站点迁移角色执行，运行账号仅获得本站 schema 权限。
CREATE SCHEMA IF NOT EXISTS site_blog;

CREATE TABLE site_blog.sessions (
  token_digest text PRIMARY KEY,
  user_id text NOT NULL,
  sid text,
  tokens text NOT NULL,
  profile jsonb,
  checked_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_sid_idx ON site_blog.sessions(sid);

CREATE TABLE site_blog.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug text NOT NULL CHECK (length(post_slug) BETWEEN 1 AND 240),
  user_id text NOT NULL,
  author_name text NOT NULL CHECK (length(author_name) BETWEEN 1 AND 120),
  author_image text,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_post_order_idx ON site_blog.comments(post_slug, created_at DESC, id DESC);
CREATE INDEX comments_user_idx ON site_blog.comments(user_id);

CREATE VIEW site_blog.comments_v1 AS
  SELECT id, post_slug, user_id, body, created_at FROM site_blog.comments;

-- 由数据库管理员将 blog_app 替换为本站实际运行角色。
-- GRANT USAGE ON SCHEMA site_blog TO blog_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON site_blog.sessions, site_blog.comments TO blog_app;
