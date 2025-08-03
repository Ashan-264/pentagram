# Clerk + Supabase JWT Setup Guide

## Overview

This guide shows how to integrate Clerk authentication with Supabase using JWTs for secure database access with Row-Level Security (RLS).

## Prerequisites

- Clerk account with JWT template configured
- Supabase project
- Environment variables configured

## Environment Variables

Add these to your `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

## Clerk JWT Template Configuration

In your Clerk Dashboard:

1. Go to **JWT Templates**
2. Create a new template named "supabase"
3. Set the signing algorithm to **RS256**
4. Configure claims:

```json
{
  "aud": "authenticated",
  "exp": {{exp}},
  "iat": {{iat}},
  "iss": "{{org.slug || 'clerk'}}",
  "nbf": {{nbf}},
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}",
  "role": "authenticated",
  "app_metadata": {
    "provider": "clerk",
    "providers": ["clerk"]
  },
  "user_metadata": {
    "email": "{{user.primary_email_address.email_address}}",
    "full_name": "{{user.full_name}}",
    "first_name": "{{user.first_name}}",
    "last_name": "{{user.last_name}}"
  }
}
```

## Supabase Configuration

### 1. Add Clerk JWT Secret to Supabase

In your Supabase Dashboard:

1. Go to **Settings** → **API**
2. Scroll to **JWT Settings**
3. Add a new **JWT Secret** with:
   - **Name**: clerk
   - **Secret**: Your Clerk JWT verification key (get from Clerk Dashboard → API Keys → Advanced → JWT public key)

### 2. Supabase RLS Policies

Enable RLS on all tables and create policies that use Clerk user IDs:

#### Users Table Policies

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.jwt() ->> 'sub' = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.jwt() ->> 'sub' = id);

-- Allow inserts for authenticated users (for user creation)
CREATE POLICY "Allow user creation" ON users
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = id);
```

#### Images Table Policies

```sql
-- Enable RLS
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Anyone can read public images
CREATE POLICY "Anyone can read public images" ON images
  FOR SELECT USING (is_public = true);

-- Users can read their own images (public or private)
CREATE POLICY "Users can read own images" ON images
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

-- Users can insert their own images
CREATE POLICY "Users can insert own images" ON images
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Users can update their own images
CREATE POLICY "Users can update own images" ON images
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

-- Users can delete their own images
CREATE POLICY "Users can delete own images" ON images
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);
```

#### Comments Table Policies

```sql
-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments on public images
CREATE POLICY "Read comments on public images" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM images
      WHERE images.id = comments.image_id
      AND images.is_public = true
    )
  );

-- Users can read comments on their own images
CREATE POLICY "Users can read comments on own images" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM images
      WHERE images.id = comments.image_id
      AND auth.jwt() ->> 'sub' = images.user_id
    )
  );

-- Authenticated users can insert comments on public images
CREATE POLICY "Authenticated users can comment on public images" ON comments
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'sub' = user_id AND
    EXISTS (
      SELECT 1 FROM images
      WHERE images.id = comments.image_id
      AND images.is_public = true
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);
```

#### Likes Table Policies

```sql
-- Enable RLS
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Anyone can read likes on public images
CREATE POLICY "Read likes on public images" ON likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM images
      WHERE images.id = likes.image_id
      AND images.is_public = true
    )
  );

-- Users can read likes on their own images
CREATE POLICY "Users can read likes on own images" ON likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM images
      WHERE images.id = likes.image_id
      AND auth.jwt() ->> 'sub' = images.user_id
    )
  );

-- Authenticated users can like public images
CREATE POLICY "Authenticated users can like public images" ON likes
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'sub' = user_id AND
    EXISTS (
      SELECT 1 FROM images
      WHERE images.id = likes.image_id
      AND images.is_public = true
    )
  );

-- Users can unlike their own likes
CREATE POLICY "Users can delete own likes" ON likes
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);
```

## Usage in Frontend

### 1. Making Authenticated Requests

```typescript
import { useAuth } from "@clerk/nextjs";
import { authenticatedGet, authenticatedPost } from "../lib/auth-api";

function MyComponent() {
  const { getToken } = useAuth();

  const fetchData = async () => {
    const response = await authenticatedGet("/api/my-endpoint", getToken);
    const data = await response.json();
    return data;
  };

  const createData = async payload => {
    const response = await authenticatedPost(
      "/api/my-endpoint",
      payload,
      getToken
    );
    return response.json();
  };
}
```

### 2. Getting Authenticated Supabase Client

```typescript
import { useAuth } from "@clerk/nextjs";
import { getAuthenticatedSupabaseClient } from "../lib/supabase";

function MyComponent() {
  const { getToken } = useAuth();

  const fetchUserData = async () => {
    const supabase = await getAuthenticatedSupabaseClient(getToken);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId);

    return data;
  };
}
```

## API Route Examples

### Using Clerk Auth in API Routes

```typescript
// pages/api/my-endpoint.ts
import {
  getAuthenticatedSupabaseFromRequest,
  getCurrentUser,
} from "../../lib/clerk-supabase";

export default async function handler(req: NextRequest) {
  try {
    // Get current user from Clerk
    const { userId } = await getCurrentUser();

    // Get authenticated Supabase client
    const supabase = await getAuthenticatedSupabaseFromRequest(req);

    // Now you can make authenticated queries
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId);

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
```

## Testing

1. **Sign in with Clerk** - Users must be authenticated
2. **Check JWT claims** - Verify the token contains correct user info
3. **Test RLS policies** - Ensure users can only access their own data
4. **Test public access** - Verify public images are accessible to all

## Security Notes

- Always use RLS policies to enforce data access rules
- Never expose service role keys to the frontend
- Use Clerk's `getToken()` method with the 'supabase' template
- Validate user permissions in API routes
- Test all access patterns thoroughly

## Troubleshooting

1. **JWT verification fails**: Check Clerk public key in Supabase
2. **RLS blocks all access**: Verify policies use `auth.jwt() ->> 'sub'`
3. **Token not found**: Ensure user is signed in and template name is correct
4. **Policy errors**: Check that table columns match policy conditions
