ALTER TABLE site_blog.comments ADD COLUMN IF NOT EXISTS author_email text;

CREATE TABLE IF NOT EXISTS site_blog.profiles (
  user_id text PRIMARY KEY,
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  email text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_blog.notification_settings (
  user_id text PRIMARY KEY,
  email text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_blog.site_preferences (
  key text PRIMARY KEY,
  enabled boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO site_blog.site_preferences(key,enabled) VALUES('comment_notifications',true) ON CONFLICT(key) DO NOTHING;

CREATE TABLE IF NOT EXISTS site_blog.comment_subscriptions (
  user_id text NOT NULL,
  post_slug text NOT NULL CHECK (length(post_slug) BETWEEN 1 AND 240),
  email text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_slug)
);
CREATE INDEX IF NOT EXISTS comment_subscriptions_post_idx ON site_blog.comment_subscriptions(post_slug) WHERE enabled;

GRANT SELECT, INSERT, UPDATE, DELETE ON site_blog.profiles, site_blog.notification_settings, site_blog.comment_subscriptions, site_blog.site_preferences TO blog_app;
