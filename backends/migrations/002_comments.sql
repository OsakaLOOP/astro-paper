ALTER TABLE site_blog.comments DROP CONSTRAINT comments_body_check;
ALTER TABLE site_blog.comments ADD COLUMN parent_id uuid REFERENCES site_blog.comments(id);
ALTER TABLE site_blog.comments ADD COLUMN updated_at timestamptz;
ALTER TABLE site_blog.comments ADD COLUMN deleted_at timestamptz;
ALTER TABLE site_blog.comments ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE site_blog.comments ADD CONSTRAINT comments_body_check CHECK (
  (deleted_at IS NOT NULL AND body = '') OR (deleted_at IS NULL AND length(trim(body)) BETWEEN 1 AND 2000)
);
CREATE INDEX comments_parent_idx ON site_blog.comments(parent_id);
