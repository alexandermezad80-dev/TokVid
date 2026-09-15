-- Run this in the Supabase SQL Editor

-- Follows table (following_id can be real user or mock creator UUID)
CREATE TABLE IF NOT EXISTS follows (
  follower_id  uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own follows"
  ON follows FOR SELECT
  USING (auth.uid() = follower_id);

CREATE POLICY "insert own follows"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "delete own follows"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Trigger: keep following_count / followers_count in profiles in sync.
-- SECURITY DEFINER is required because this trigger updates profile counters,
-- but direct RPC execution is intentionally revoked below.
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles
      SET following_count = following_count + 1
      WHERE id = NEW.follower_id;
    UPDATE profiles
      SET followers_count = followers_count + 1
      WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles
      SET following_count = GREATEST(0, following_count - 1)
      WHERE id = OLD.follower_id;
    UPDATE profiles
      SET followers_count = GREATEST(0, followers_count - 1)
      WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- The function is trigger-only. Clients must not be able to call it as RPC.
REVOKE EXECUTE ON FUNCTION update_follow_counts() FROM anon;
REVOKE EXECUTE ON FUNCTION update_follow_counts() FROM authenticated;

CREATE OR REPLACE TRIGGER on_follow_change
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

CREATE INDEX IF NOT EXISTS follows_follower_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows(following_id);
