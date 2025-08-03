import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_API_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

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
