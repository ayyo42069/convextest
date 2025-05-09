import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get user preferences
export const getPreferences = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    return user?.preferences;
  },
});

// Update user preferences
export const updatePreferences = mutation({
  args: {
    username: v.string(),
    preferences: v.object({
      theme: v.optional(v.string()),
      notifications: v.optional(v.boolean()),
      sound: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        preferences: args.preferences,
        lastSeen: Date.now(),
        lastActivity: Date.now(),
      });
    } else {
      await ctx.db.insert("users", {
        username: args.username,
        color: "#000000",
        status: "",
        preferences: args.preferences,
        lastSeen: Date.now(),
        isOnline: true,
        lastActivity: Date.now(),
      });
    }
  },
});

// Update user status
export const updateStatus = mutation({
  args: {
    username: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        status: args.status,
        lastSeen: Date.now(),
        lastActivity: Date.now(),
      });

      // Log activity
      await ctx.db.insert("userActivity", {
        username: args.username,
        type: "status_change",
        timestamp: Date.now(),
        details: args.status,
      });
    } else {
      await ctx.db.insert("users", {
        username: args.username,
        color: "#000000",
        status: args.status,
        preferences: {},
        lastSeen: Date.now(),
        isOnline: true,
        lastActivity: Date.now(),
      });

      // Log activity
      await ctx.db.insert("userActivity", {
        username: args.username,
        type: "status_change",
        timestamp: Date.now(),
        details: args.status,
      });
    }
  },
});

// Update user appearance
export const updateAppearance = mutation({
  args: {
    username: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        color: args.color,
        lastActivity: Date.now(),
      });

      // Log activity
      await ctx.db.insert("userActivity", {
        username: args.username,
        type: "color_change",
        timestamp: Date.now(),
        details: args.color,
      });
    } else {
      await ctx.db.insert("users", {
        username: args.username,
        color: args.color,
        status: "",
        preferences: {},
        lastSeen: Date.now(),
        isOnline: true,
        lastActivity: Date.now(),
      });

      // Log activity
      await ctx.db.insert("userActivity", {
        username: args.username,
        type: "color_change",
        timestamp: Date.now(),
        details: args.color,
      });
    }
  },
});

// Get user info
export const getUser = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username))
      .first();
  },
});

export const checkUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username))
      .first();

    return {
      isTaken: !!user,
    };
  },
});

export const saveAccount = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    // Check if account already exists for this device
    const existingAccount = await ctx.db
      .query("savedAccounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("deviceId"), args.deviceId),
          q.eq(q.field("username"), args.username)
        )
      )
      .first();

    if (existingAccount) {
      // Update existing account
      await ctx.db.patch(existingAccount._id, {
        color: args.color,
        status: args.status,
        avatar: args.avatar,
        preferences: args.preferences,
        lastUsed: Date.now(),
      });
    } else {
      // Check if device has reached account limit
      const accounts = await ctx.db
        .query("savedAccounts")
        .filter((q) => q.eq(q.field("deviceId"), args.deviceId))
        .collect();

      if (accounts.length >= 3) {
        // Remove oldest account
        const oldestAccount = accounts.reduce((oldest, current) => 
          current.lastUsed < oldest.lastUsed ? current : oldest
        );
        await ctx.db.delete(oldestAccount._id);
      }

      // Create new account
      await ctx.db.insert("savedAccounts", {
        deviceId: args.deviceId,
        username: args.username,
        color: args.color,
        status: args.status,
        avatar: args.avatar,
        preferences: args.preferences,
        lastUsed: Date.now(),
      });

      // Create or update user record
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("username"), args.username))
        .first();

      if (user) {
        await ctx.db.patch(user._id, {
          color: args.color,
          status: args.status,
          avatar: args.avatar,
          preferences: args.preferences,
          lastSeen: Date.now(),
          isOnline: true,
          lastActivity: Date.now(),
        });
      } else {
        await ctx.db.insert("users", {
          username: args.username,
          color: args.color,
          status: args.status,
          avatar: args.avatar,
          preferences: args.preferences,
          lastSeen: Date.now(),
          isOnline: true,
          lastActivity: Date.now(),
        });
      }
    }
  },
});

export const getSavedAccounts = query({
  args: {
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("savedAccounts")
      .filter((q) => q.eq(q.field("deviceId"), args.deviceId))
      .order("desc")
      .take(3);
    return accounts;
  },
});

export const getAccountCount = query({
  args: {
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("savedAccounts")
      .filter((q) => q.eq(q.field("deviceId"), args.deviceId))
      .collect();

    return {
      count: accounts.length,
      maxAccounts: 3,
    };
  },
});

export const updatePresence = mutation({
  args: {
    username: v.string(),
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        isOnline: args.isOnline,
        lastSeen: Date.now(),
        lastActivity: Date.now(),
      });

      // Log activity
      await ctx.db.insert("userActivity", {
        username: args.username,
        type: args.isOnline ? "login" : "logout",
        timestamp: Date.now(),
      });
    }
  },
});

export const updateAvatar = mutation({
  args: {
    username: v.string(),
    avatar: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        avatar: args.avatar,
        lastActivity: Date.now(),
      });

      // Log activity
      await ctx.db.insert("userActivity", {
        username: args.username,
        type: "avatar_change",
        timestamp: Date.now(),
      });
    }
  },
});

export const getActivityHistory = query({
  args: {
    username: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("userActivity")
      .filter((q) => q.eq(q.field("username"), args.username))
      .order("desc")
      .take(args.limit || 50);
    return activities.reverse();
  },
});

export const getOnlineUsers = query({
  args: {},
  handler: async (ctx) => {
    const onlineUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isOnline"), true))
      .collect();
    return onlineUsers;
  },
}); 