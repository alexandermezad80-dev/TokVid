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

const notificationTypes = ["like", "comment", "follow", "mention", "system"] as const;

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
  videoId: text("video_id").notNull(),
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
  videoId: text("video_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.videoId] })]);

export const savedVideos = pgTable("saved_videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  videoId: text("video_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("saved_videos_user_video_unique").on(table.userId, table.videoId)]);

export const hashtags = pgTable("hashtags", {
  id: uuid("id").primaryKey().defaultRandom(),
  tag: text("tag").notNull(),
  usageCount: integer("usage_count").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const videoHashtags = pgTable("video_hashtags", {
  videoId: uuid("video_id").notNull(),
  hashtagId: uuid("hashtag_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [primaryKey({ columns: [table.videoId, table.hashtagId] })]);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  user1Id: uuid("user1_id").notNull(),
  user2Id: uuid("user2_id").notNull(),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow(),
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
  data: jsonb("data").default({}),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles)
  .omit({ createdAt: true, updatedAt: true })
  .superRefine((value, ctx) => {
    const username = value.username.trim();
    if (username.length < 3 || username.length > 30) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["username"], message: "El usuario debe tener entre 3 y 30 caracteres" });
    }
    if (value.email && value.email.trim() !== "") {
      const emailResult = z.string().email().safeParse(value.email.trim());
      if (!emailResult.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "El correo electrónico no es válido" });
      }
    }
  });

export const insertVideoSchema = createInsertSchema(videos)
  .omit({ id: true, createdAt: true, likesCount: true, commentsCount: true, sharesCount: true })
  .superRefine((value, ctx) => {
    try {
      new URL(value.url.trim());
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["url"], message: "La URL del video no es válida" });
    }
    if (value.caption != null && value.caption.trim().length > 220) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["caption"], message: "El texto no puede superar 220 caracteres" });
    }
  });

export const insertCommentSchema = createInsertSchema(comments)
  .omit({ id: true, createdAt: true })
  .superRefine((value, ctx) => {
    const text = value.text.trim();
    if (text.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["text"], message: "El comentario no puede estar vacío" });
    } else if (text.length > 500) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["text"], message: "El comentario no puede superar 500 caracteres" });
    }
  });

export const insertFollowSchema = createInsertSchema(follows).superRefine((value, ctx) => {
  if (value.followerId === value.followingId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["followingId"], message: "Un usuario no puede seguirse a sí mismo" });
  }
});

export const insertVideoLikeSchema = createInsertSchema(videoLikes);

export const insertSavedVideoSchema = createInsertSchema(savedVideos).omit({ id: true, createdAt: true });

export const insertHashtagSchema = createInsertSchema(hashtags)
  .omit({ id: true, usageCount: true, createdAt: true })
  .superRefine((value, ctx) => {
    const tag = value.tag.trim();
    if (tag.length === 0 || tag.length > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tag"], message: "El hashtag debe tener entre 1 y 100 caracteres" });
    }
  });

export const insertVideoHashtagSchema = createInsertSchema(videoHashtags).omit({ createdAt: true });

export const insertConversationSchema = createInsertSchema(conversations)
  .omit({ id: true, createdAt: true })
  .superRefine((value, ctx) => {
    if (value.user1Id === value.user2Id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["user2Id"], message: "Una conversación necesita dos usuarios distintos" });
    }
  });

export const insertMessageSchema = createInsertSchema(messages)
  .omit({ id: true, createdAt: true, readByOther: true })
  .superRefine((value, ctx) => {
    const text = value.text.trim();
    if (text.length === 0 || text.length > 1000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["text"], message: "El mensaje debe tener entre 1 y 1000 caracteres" });
    }
  });

export const insertNotificationSchema = createInsertSchema(notifications)
  .omit({ id: true, createdAt: true, read: true })
  .superRefine((value, ctx) => {
    if (!(notificationTypes as readonly string[]).includes(value.type)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["type"], message: "El tipo de notificación no es válido" });
    }
    if (value.message.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["message"], message: "El mensaje de notificación no puede estar vacío" });
    }
  });

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
