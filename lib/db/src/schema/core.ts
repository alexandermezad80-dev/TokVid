import { z } from "zod";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

const nonEmptyText = z.string().trim().min(1);
const emailSchema = z
  .string()
  .trim()
  .email("El correo electrónico no es válido")
  .optional()
  .or(z.literal(""));

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  followersCount: integer("followers_count").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),
  likesCount: integer("likes_count").notNull().default(0),
  pushToken: text("push_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("profiles_username_unique").on(table.username)]);

export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  url: text("url").notNull(),
  caption: text("caption"),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  sharesCount: integer("shares_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id").notNull(),
  userId: uuid("user_id").notNull(),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const follows = pgTable("follows", {
  followerId: uuid("follower_id").notNull(),
  followingId: uuid("following_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.followerId, table.followingId] })]);

export const videoLikes = pgTable("video_likes", {
  userId: uuid("user_id").notNull(),
  videoId: uuid("video_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.videoId] })]);

export const savedVideos = pgTable("saved_videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  videoId: uuid("video_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("saved_videos_user_video_unique").on(table.userId, table.videoId)]);

export const hashtags = pgTable("hashtags", {
  id: uuid("id").primaryKey().defaultRandom(),
  tag: text("tag").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
});

export const videoHashtags = pgTable("video_hashtags", {
  videoId: uuid("video_id").notNull(),
  hashtagId: uuid("hashtag_id").notNull(),
}, (table) => [primaryKey({ columns: [table.videoId, table.hashtagId] })]);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  user1Id: uuid("user1_id").notNull(),
  user2Id: uuid("user2_id").notNull(),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  text: text("text").notNull(),
  readByOther: boolean("read_by_other").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  actorId: uuid("actor_id"),
  actorName: text("actor_name"),
  actorAvatar: text("actor_avatar"),
  type: text("type").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles, {
  username: nonEmptyText.min(3, "El usuario debe tener al menos 3 caracteres").max(30),
  email: emailSchema,
}).omit({ createdAt: true, updatedAt: true });

export const insertVideoSchema = createInsertSchema(videos, {
  url: z.string().trim().url("La URL del video no es válida"),
  caption: z.string().trim().max(220).optional().nullable(),
}).omit({ id: true, createdAt: true, likesCount: true, commentsCount: true, sharesCount: true });

export const insertCommentSchema = createInsertSchema(comments, {
  text: nonEmptyText.max(500, "El comentario no puede superar 500 caracteres"),
}).omit({ id: true, createdAt: true });

export const insertFollowSchema = createInsertSchema(follows).superRefine((value, ctx) => {
  if (value.followerId === value.followingId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["followingId"], message: "Un usuario no puede seguirse a sí mismo" });
  }
});

export const insertVideoLikeSchema = createInsertSchema(videoLikes);

export const insertSavedVideoSchema = createInsertSchema(savedVideos).omit({ id: true, createdAt: true });

export const insertHashtagSchema = createInsertSchema(hashtags, {
  tag: nonEmptyText.min(1).max(100),
}).omit({ id: true, usageCount: true });

export const insertVideoHashtagSchema = createInsertSchema(videoHashtags);

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true }).superRefine((value, ctx) => {
  if (value.user1Id === value.user2Id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["user2Id"], message: "Una conversación necesita dos usuarios distintos" });
  }
});

export const insertMessageSchema = createInsertSchema(messages, {
  text: nonEmptyText.max(1000, "El mensaje no puede superar 1000 caracteres"),
}).omit({ id: true, createdAt: true, readByOther: true });

export const insertNotificationSchema = createInsertSchema(notifications, {
  type: z.enum(["like", "comment", "follow", "mention", "system"]),
  message: nonEmptyText,
}).omit({ id: true, createdAt: true, read: true });

export type Profile = typeof profiles.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type VideoLike = typeof videoLikes.$inferSelect;
export type SavedVideo = typeof savedVideos.$inferSelect;
export type Hashtag = typeof hashtags.$inferSelect;
export type VideoHashtag = typeof videoHashtags.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
