import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { PublicationComposer } from "./(tabs)/create";
export default function CommentVideoReplyScreen() {
  const { commentId } = useLocalSearchParams<{ commentId: string }>();
  return <PublicationComposer key={commentId} replyCommentId={commentId || "invalid"} onExit={() => router.back()} />;
}
