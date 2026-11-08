CREATE OR REPLACE VIEW site_blog.analytics_users WITH (security_barrier = true) AS
SELECT id::text AS user_id, name AS display_name, email
FROM auth."user";

GRANT SELECT ON site_blog.analytics_users TO blog_app;
