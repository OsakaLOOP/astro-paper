CREATE TABLE IF NOT EXISTS site_blog.article_view_visitors (
  post_slug text NOT NULL CHECK (length(post_slug) BETWEEN 1 AND 240),
  visitor_key text NOT NULL CHECK (length(visitor_key) BETWEEN 1 AND 320),
  user_id text,
  ip_hash text,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  view_count bigint NOT NULL DEFAULT 1 CHECK (view_count > 0),
  PRIMARY KEY (post_slug, visitor_key)
);
CREATE INDEX IF NOT EXISTS article_view_visitors_user_idx
  ON site_blog.article_view_visitors(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS site_blog.article_view_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_slug text NOT NULL CHECK (length(post_slug) BETWEEN 1 AND 240),
  visitor_key text NOT NULL,
  user_id text,
  ip_hash text,
  user_agent text,
  referrer text,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS article_view_events_post_time_idx
  ON site_blog.article_view_events(post_slug, viewed_at DESC);
CREATE INDEX IF NOT EXISTS article_view_events_user_time_idx
  ON site_blog.article_view_events(user_id, viewed_at DESC)
  WHERE user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON site_blog.article_view_visitors, site_blog.article_view_events TO blog_app;
GRANT USAGE, SELECT ON SEQUENCE site_blog.article_view_events_id_seq TO blog_app;
