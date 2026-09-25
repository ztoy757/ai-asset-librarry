CREATE TABLE assets (
  id           UUID PRIMARY KEY,
  file_name    TEXT        NOT NULL CHECK (length(file_name) > 0),
  content_type TEXT        NOT NULL,
  kind         TEXT        NOT NULL CHECK (kind IN ('image', 'audio', 'video')),
  size_bytes   BIGINT      NOT NULL CHECK (size_bytes > 0),
  created_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX assets_created_at_idx ON assets (created_at DESC);
