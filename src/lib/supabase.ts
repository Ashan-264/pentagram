import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create the default client (for non-authenticated requests)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Create authenticated client with Clerk JWT
export const createAuthenticatedSupabaseClient = (
  token: string
): SupabaseClient => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase configuration missing");
  }
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};

// Helper function to get authenticated Supabase client
export const getAuthenticatedSupabaseClient = async (
  getToken: (options?: { template?: string }) => Promise<string | null>
): Promise<SupabaseClient> => {
  const token = await getToken({ template: "supabase" });
  if (!token) {
    throw new Error("No authentication token available");
  }
  return createAuthenticatedSupabaseClient(token);
};

// Types for our database tables
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Image {
  id: string;
  user_id: string;
  blob_name: string;
  is_public: boolean;
  upload_date: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  image_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
}

export interface Like {
  id: string;
  image_id: string;
  user_id: string;
  created_at: string;
}

// Extended types with joined data
export interface ImageWithUser extends Image {
  users: Pick<User, "username" | "name">;
}

export interface CommentWithUser extends Comment {
  users: Pick<User, "username" | "name">;
}
