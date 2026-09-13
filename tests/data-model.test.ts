import { describe, expect, it } from "vitest";
import {
  insertCommentSchema,
  insertConversationSchema,
  insertFollowSchema,
  insertNotificationSchema,
  insertProfileSchema,
  insertVideoSchema,
} from "../lib/db/src/schema/core";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const videoId = "33333333-3333-4333-8333-333333333333";

function validProfile() {
  return { id: userId, username: "usuario123", email: "usuario@example.com" };
}

describe("Core data model validations", () => {
  it("accepts a valid profile", () => {
    expect(insertProfileSchema.parse(validProfile())).toMatchObject(validProfile());
  });

  it("rejects an invalid email", () => {
    expect(() => insertProfileSchema.parse({ ...validProfile(), email: "correo-sin-arroba" })).toThrow();
  });

  it("rejects an invalid video URL", () => {
    expect(() => insertVideoSchema.parse({ userId, url: "no-es-una-url" })).toThrow();
  });

  it("rejects an empty comment", () => {
    expect(() => insertCommentSchema.parse({ videoId, userId, username: "usuario123", text: "   " })).toThrow();
  });

  it("rejects comments longer than 500 characters", () => {
    expect(() => insertCommentSchema.parse({ videoId, userId, username: "usuario123", text: "a".repeat(501) })).toThrow();
  });

  it("rejects following yourself", () => {
    expect(() => insertFollowSchema.parse({ followerId: userId, followingId: userId })).toThrow();
  });

  it("accepts following another user", () => {
    expect(insertFollowSchema.parse({ followerId: userId, followingId: otherUserId })).toMatchObject({ followerId: userId, followingId: otherUserId });
  });

  it("rejects a conversation with the same user twice", () => {
    expect(() => insertConversationSchema.parse({ user1Id: userId, user2Id: userId })).toThrow();
  });

  it("accepts an allowed notification type", () => {
    expect(insertNotificationSchema.parse({ userId, actorId: otherUserId, type: "like", message: "Te gustó un video" })).toMatchObject({ type: "like" });
  });

  it("rejects an unknown notification type", () => {
    expect(() => insertNotificationSchema.parse({ userId, type: "unknown", message: "Aviso" })).toThrow();
  });
});
