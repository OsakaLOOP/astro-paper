ALTER TABLE site_blog.profiles ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE site_blog.comments ADD COLUMN IF NOT EXISTS author_url text;
