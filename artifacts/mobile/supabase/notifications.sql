-- Run this in the Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token text;

CREATE TABLE IF NOT EXISTS notifications (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  actor_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name   text,
  actor_avatar text,
  type         text NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'system')),
  message      text NOT NULL,
  data         jsonb DEFAULT '{}',
  read         boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Actor can insert notifications" ON public.notifications;
CREATE POLICY "Actor can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- Notification identity/content is server-owned. A client may only change
-- the read flag on its own notification.
CREATE OR REPLACE FUNCTION public.protect_notification_authoritative_fields()
RETURNS trigger AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
     OR NEW.actor_name IS DISTINCT FROM OLD.actor_name
     OR NEW.actor_avatar IS DISTINCT FROM OLD.actor_avatar
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.data IS DISTINCT FROM OLD.data
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'notification authoritative fields are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_notification_authoritative_fields ON public.notifications;
CREATE TRIGGER protect_notification_authoritative_fields
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.protect_notification_authoritative_fields();

CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON notifications(user_id, created_at DESC);
