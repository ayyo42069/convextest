import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    text: v.string(),
    username: v.string(),
    timestamp: v.number(),
    color: v.string(),
    edited: v.optional(v.boolean()),
    deleted: v.optional(v.boolean()),
    reactions: v.optional(v.array(v.object({ user: v.string(), emoji: v.string() }))),
    delivered: v.optional(v.boolean()),
    readBy: v.optional(v.array(v.string())),
  }),
  
  users: defineTable({
    username: v.string(),           // Username
    color: v.string(),              // Custom color
    status: v.string(),            // Status message
    avatar: v.optional(v.string()), // Avatar URL or data
    preferences: v.object({
      theme: v.optional(v.string()),
      notifications: v.optional(v.boolean()),
      sound: v.optional(v.boolean()),
    }),
    lastSeen: v.optional(v.number()),          // Last seen timestamp
    isOnline: v.optional(v.boolean()),         // Online status
    lastActivity: v.optional(v.number()),      // Last activity timestamp
  }).index("by_username", ["username"]),
  savedAccounts: defineTable({
    deviceId: v.string(),
    username: v.string(),
    color: v.string(),
    status: v.string(),
    avatar: v.optional(v.string()),
    preferences: v.object({
      theme: v.optional(v.string()),
      notifications: v.optional(v.boolean()),
      sound: v.optional(v.boolean()),
    }),
    lastUsed: v.number(),
  }).index("by_device", ["deviceId"]),
  userActivity: defineTable({
    username: v.string(),
    type: v.string(), // "login", "message", "status_change", "color_change", etc.
    timestamp: v.number(),
    details: v.optional(v.string()),
  }).index("by_username", ["username"]),
  typing: defineTable({
    username: v.string(),
    timestamp: v.number(),
  }),
}); 