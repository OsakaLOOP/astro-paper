ALTER TABLE site_blog.notification_settings
  ADD COLUMN IF NOT EXISTS auto_subscribe_comments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_notifications_enabled boolean NOT NULL DEFAULT false;
