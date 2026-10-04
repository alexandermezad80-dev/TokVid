DROP POLICY IF EXISTS "participant update convos" ON public.conversations;

CREATE POLICY "participant update convos"
ON public.conversations
FOR UPDATE
TO public
USING (
  (SELECT auth.uid()) = user1_id
  OR (SELECT auth.uid()) = user2_id
)
WITH CHECK (
  (SELECT auth.uid()) = user1_id
  OR (SELECT auth.uid()) = user2_id
);

DROP POLICY IF EXISTS "participant update messages" ON public.messages;

CREATE POLICY "participant update messages"
ON public.messages
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND (
        conversations.user1_id = (SELECT auth.uid())
        OR conversations.user2_id = (SELECT auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND (
        conversations.user1_id = (SELECT auth.uid())
        OR conversations.user2_id = (SELECT auth.uid())
      )
  )
);
