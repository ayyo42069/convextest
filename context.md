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

## Development Configuration

### TypeScript Configuration
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### Package Dependencies
```json
// package.json
{
  "dependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint-plugin-react-hooks": "^4.6.0"
  }
}
```

### Type Safety Best Practices
1. **Avoid `any` Type**
   ```typescript
   // ❌ Bad
   function processData(data: any) { ... }
   
   // ✅ Good
   interface Data {
     id: string;
     value: number;
   }
   function processData(data: Data) { ... }
   ```

2. **Proper Event Types**
   ```typescript
   // ❌ Bad
   const handleChange = (e) => { ... }
   
   // ✅ Good
   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... }
   ```

3. **React Hook Dependencies**
   ```typescript
   // ❌ Bad
   useEffect(() => {
     updateData();
   }, []); // Missing dependency
   
   // ✅ Good
   useEffect(() => {
     updateData();
   }, [updateData]); // Include all dependencies
   ```

4. **Proper Error Handling**
   ```typescript
   // ❌ Bad
   try {
     await someAsyncFunction();
   } catch (e) { ... }
   
   // ✅ Good
   try {
     await someAsyncFunction();
   } catch (error) {
     if (error instanceof Error) {
       console.error(error.message);
     }
   }
   ```

### Common TypeScript Patterns
1. **Type Guards**
   ```typescript
   function isUser(obj: unknown): obj is User {
     return (
       typeof obj === 'object' &&
       obj !== null &&
       'username' in obj &&
       'id' in obj
     );
   }
   ```

2. **Discriminated Unions**
   ```typescript
   type Message = 
     | { type: 'text'; content: string }
     | { type: 'image'; url: string }
     | { type: 'file'; path: string };
   ```

3. **Utility Types**
   ```typescript
   type PartialUser = Partial<User>;
   type ReadonlyUser = Readonly<User>;
   type UserWithoutId = Omit<User, 'id'>;
   ```

### ESLint Rules Explanation
1. `@typescript-eslint/no-explicit-any`: Prevents use of `any` type
2. `@typescript-eslint/no-unused-vars`: Catches unused variables
3. `react-hooks/rules-of-hooks`: Ensures hooks are called correctly
4. `react-hooks/exhaustive-deps`: Checks hook dependencies
5. `no-console`: Warns about console statements in production

### Development Workflow
1. Run `npm run lint` before committing
2. Use VS Code with ESLint and TypeScript extensions
3. Enable "Format on Save" in VS Code
4. Use Prettier for consistent formatting
5. Set up pre-commit hooks with husky

### VS Code Settings
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

These configurations will help maintain code quality and prevent common issues in the future. Make sure to:
1. Keep dependencies up to date
2. Run linting before committing
3. Follow TypeScript best practices
4. Use proper error handling
5. Maintain consistent code style

## Development Configuration

### TypeScript Configuration
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### Package Dependencies
```json
// package.json
{
  "dependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint-plugin-react-hooks": "^4.6.0"
  }
}
```

### Type Safety Best Practices
1. **Avoid `any` Type**
   ```typescript
   // ❌ Bad
   function processData(data: any) { ... }
   
   // ✅ Good
   interface Data {
     id: string;
     value: number;
   }
   function processData(data: Data) { ... }
   ```

2. **Proper Event Types**
   ```typescript
   // ❌ Bad
   const handleChange = (e) => { ... }
   
   // ✅ Good
   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... }
   ```

3. **React Hook Dependencies**
   ```typescript
   // ❌ Bad
   useEffect(() => {
     updateData();
   }, []); // Missing dependency
   
   // ✅ Good
   useEffect(() => {
     updateData();
   }, [updateData]); // Include all dependencies
   ```

4. **Proper Error Handling**
   ```typescript
   // ❌ Bad
   try {
     await someAsyncFunction();
   } catch (e) { ... }
   
   // ✅ Good
   try {
     await someAsyncFunction();
   } catch (error) {
     if (error instanceof Error) {
       console.error(error.message);
     }
   }
   ```

### Common TypeScript Patterns
1. **Type Guards**
   ```typescript
   function isUser(obj: unknown): obj is User {
     return (
       typeof obj === 'object' &&
       obj !== null &&
       'username' in obj &&
       'id' in obj
     );
   }
   ```

2. **Discriminated Unions**
   ```typescript
   type Message = 
     | { type: 'text'; content: string }
     | { type: 'image'; url: string }
     | { type: 'file'; path: string };
   ```

3. **Utility Types**
   ```typescript
   type PartialUser = Partial<User>;
   type ReadonlyUser = Readonly<User>;
   type UserWithoutId = Omit<User, 'id'>;
   ```

### ESLint Rules Explanation
1. `@typescript-eslint/no-explicit-any`: Prevents use of `any` type
2. `@typescript-eslint/no-unused-vars`: Catches unused variables
3. `react-hooks/rules-of-hooks`: Ensures hooks are called correctly
4. `react-hooks/exhaustive-deps`: Checks hook dependencies
5. `no-console`: Warns about console statements in production

### Development Workflow
1. Run `npm run lint` before committing
2. Use VS Code with ESLint and TypeScript extensions
3. Enable "Format on Save" in VS Code
4. Use Prettier for consistent formatting
5. Set up pre-commit hooks with husky

### VS Code Settings
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

These configurations will help maintain code quality and prevent common issues in the future. Make sure to:
1. Keep dependencies up to date
2. Run linting before committing
3. Follow TypeScript best practices
4. Use proper error handling
5. Maintain consistent code style 