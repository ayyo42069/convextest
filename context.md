# Convex Chat Application Documentation

## Project Structure
```
convextest/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout with ConvexClientProvider
│   │   └── page.tsx        # Home page with Chat component
│   ├── components/
│   │   ├── providers.tsx   # Convex client provider setup
│   │   ├── chat.tsx        # Main chat component
│   │   └── ui/            # Shadcn UI components
│   └── convex/
│       ├── schema.ts      # Database schema definition
│       └── messages.ts    # Convex functions
```

## ⚠️ IMPORTANT: Schema Updates
When adding new functions or features that require data storage:
1. ALWAYS update `convex/schema.ts` first
2. Define all required fields and their types
3. Add appropriate indexes for query performance
4. Deploy schema changes before adding functions
5. Schema changes require redeployment with `npx convex deploy`

Example schema update process:
```typescript
// 1. Update schema.ts first
export default defineSchema({
  users: defineTable({
    username: v.string(),
    // Add new fields here
    newField: v.string(),
  }).index("by_username", ["username"]),
});

// 2. Then add functions in separate files
export const newFunction = mutation({
  args: {
    // Match schema types
    newField: v.string(),
  },
  handler: async (ctx, args) => {
    // Use new fields
  },
});
```

## Database Schema
The application uses a simple schema with a single `messages` table:

```typescript
// convex/schema.ts
export default defineSchema({
  messages: defineTable({
    text: v.string(),      // Message content
    username: v.string(),  // Sender's username
    timestamp: v.number(), // Unix timestamp
  }),
});
```

## Convex Functions

### Messages API
1. **Send Message**
```typescript
// convex/messages.ts
export const send = mutation({
  args: {
    text: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      text: args.text,
      username: args.username,
      timestamp: Date.now(),
    });
    return messageId;
  },
});
```

2. **List Messages**
```typescript
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
```

## Client-Side Implementation

### Convex Client Setup
```typescript
// src/components/providers.tsx
"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

### Chat Component
The chat component uses Convex hooks for real-time updates:
- `useQuery(api.messages.list)` for fetching messages
- `useMutation(api.messages.send)` for sending messages

## Current Features
1. Real-time message updates
2. Username-based chat
3. Message history (last 100 messages)
4. Timestamp tracking
5. Responsive UI with Shadcn components

## Potential Improvements

### Schema Enhancements
1. Add message status (sent, delivered, read)
2. Add message types (text, image, file)
3. Add user profiles table
4. Add chat rooms/channels support
5. Add message reactions

### Function Improvements
1. Add pagination for message history
2. Add message search functionality
3. Add message editing/deletion
4. Add user presence tracking
5. Add typing indicators

### Security Enhancements
1. Add user authentication
2. Add message encryption
3. Add rate limiting
4. Add message moderation
5. Add user blocking

### UI/UX Improvements
1. Add message read receipts
2. Add file upload support
3. Add emoji picker
4. Add message formatting
5. Add dark mode support

### Performance Optimizations
1. Implement message batching
2. Add message caching
3. Optimize real-time updates
4. Add offline support
5. Implement message compression

## Deployment Configuration
The application uses a self-hosted Convex instance with the following environment variables:
```env
CONVEX_SELF_HOSTED_URL=https://backend-t04swg04gooo00sw40owsk4w.tuning-portal.eu
CONVEX_SELF_HOSTED_ADMIN_KEY=self-hosted-convex|...
NEXT_PUBLIC_CONVEX_URL=https://backend-t04swg04gooo00sw40owsk4w.tuning-portal.eu
```

## Development Workflow
1. Run `npx convex dev` to start the development server
2. Changes to schema require redeployment
3. Functions are automatically deployed on save
4. Use `npx convex deploy` for production deployment

## Best Practices
1. Keep functions small and focused
2. Use TypeScript for type safety
3. Implement proper error handling
4. Use environment variables for configuration
5. Follow React Server Components patterns
6. Implement proper loading states
7. Use proper error boundaries
8. Implement proper testing
9. Use proper logging
10. Follow security best practices

## Common Issues and Solutions
1. Schema changes require redeployment
2. Environment variables must be properly set
3. Client components must be marked with "use client"
4. Functions must be properly exported
5. Proper error handling must be implemented
6. Proper loading states must be implemented
7. Proper error boundaries must be implemented
8. Proper testing must be implemented
9. Proper logging must be implemented
10. Security best practices must be followed 