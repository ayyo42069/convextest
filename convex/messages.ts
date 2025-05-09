import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const send = mutation({
  args: {
    text: v.string(),
    username: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      text: args.text,
      username: args.username,
      color: args.color,
      timestamp: Date.now(),
      delivered: true,
      readBy: [],
    });
    return messageId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db
      .query("messages")
      .order("desc")
      .take(100);
    return messages.reverse();
  },
});

export const editMessage = mutation({
  args: { messageId: v.id("messages"), newText: v.string(), username: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.username !== args.username) throw new Error("You can only edit your own messages");
    await ctx.db.patch(args.messageId, { text: args.newText, edited: true });
    return true;
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages"), username: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.username !== args.username) throw new Error("You can only delete your own messages");
    await ctx.db.patch(args.messageId, { deleted: true });
    return true;
  },
});

export const reactToMessage = mutation({
  args: { messageId: v.id("messages"), user: v.string(), emoji: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    const reactions = message.reactions || [];
    // Remove previous reaction by this user (if any)
    const filtered = reactions.filter(r => r.user !== args.user);
    filtered.push({ user: args.user, emoji: args.emoji });
    await ctx.db.patch(args.messageId, { reactions: filtered });
    return true;
  },
});

export const searchMessages = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("messages").collect();
    return all.filter(m => !m.deleted && m.text.toLowerCase().includes(args.query.toLowerCase()));
  },
});

export const markDelivered = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { delivered: true });
    return true;
  },
});

export const markRead = mutation({
  args: { messageId: v.id("messages"), username: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return false;
    const readBy = message.readBy || [];
    if (!readBy.includes(args.username)) {
      readBy.push(args.username);
      await ctx.db.patch(args.messageId, { readBy });
    }
    return true;
  },
});

export const setTyping = mutation({
  args: { username: v.string(), isTyping: v.boolean() },
  handler: async (ctx, args) => {
    if (args.isTyping) {
      // Upsert typing record
      const existing = await ctx.db
        .query("typing")
        .filter((q) => q.eq(q.field("username"), args.username))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { timestamp: Date.now() });
      } else {
        await ctx.db.insert("typing", { username: args.username, timestamp: Date.now() });
      }
    } else {
      // Remove typing record
      const existing = await ctx.db
        .query("typing")
        .filter((q) => q.eq(q.field("username"), args.username))
        .first();
      if (existing) await ctx.db.delete(existing._id);
    }
    return true;
  },
});

export const getTypingUsers = query({
  args: {},
  handler: async (ctx) => {
    // Only show users who typed in the last 5 seconds
    const now = Date.now();
    return (await ctx.db.query("typing").collect()).filter(
      (t) => now - t.timestamp < 5000
    );
  },
}); 