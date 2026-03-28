-- Add user_id column to feed_interactions for persistent per-account likes/saves
ALTER TABLE feed_interactions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for fast lookup of a user's interactions
CREATE INDEX IF NOT EXISTS feed_interactions_user_id_idx
  ON feed_interactions (user_id, action, created_at DESC);
