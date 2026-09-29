-- Run with the SM migration role. The API role must never receive auth/core access.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'blog_app') THEN CREATE ROLE blog_app LOGIN PASSWORD 'replace-me'; END IF;
END $$;
GRANT USAGE ON SCHEMA site_blog TO blog_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON site_blog.sessions, site_blog.comments TO blog_app;
