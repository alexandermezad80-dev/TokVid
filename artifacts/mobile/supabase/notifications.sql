-- Run this in the Supabase SQL Editor

-- Add push_token column to profiles (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token text;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name  text,
  actor_avatar text,
  type        text NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'system')),
  message     text NOT NULL,
  data        jsonb DEFAULT '{}',
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- A logged-in user may only create notifications where THEY are the actor
-- (e.g. mentioning someone). Prevents spoofing notifications as another user.
-- Re-runnable: drop the existing insert policy if it exists before recreating it.
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Actor can insert notifications" ON public.notifications;

CREATE POLICY "Actor can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON notifications(user_id, created_at DESC);
