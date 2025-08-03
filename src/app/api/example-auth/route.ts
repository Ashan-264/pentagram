import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  getAuthenticatedSupabaseFromRequest,
  ensureUserExists,
} from "../../../lib/clerk-supabase";

/**
 * Example API route showing Clerk + Supabase authentication
 */

export async function GET(request: NextRequest) {
  try {
    // Method 1: Get user from Clerk server-side auth
    const { userId } = await getCurrentUser();

    // Method 2: Get authenticated Supabase client from request header
    const supabase = await getAuthenticatedSupabaseFromRequest(request);

    // Ensure user exists in our database
    const user = await ensureUserExists(userId);

    // Now you can make authenticated queries with RLS
    const { data: userImages, error } = await supabase
      .from("images")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      user: user,
      images: userImages,
      message: "Successfully fetched user data with Clerk + Supabase",
    });
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getCurrentUser();
    const supabase = await getAuthenticatedSupabaseFromRequest(request);

    // Parse request body
    //const body = await request.json();
    //const { title, description } = body;

    // Example: Create a new image record
    const { data: newImage, error } = await supabase
      .from("images")
      .insert([
        {
          user_id: userId,
          blob_name: `example-${Date.now()}.jpg`,
          is_public: true,
          upload_date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      image: newImage,
      message: "Successfully created image with authenticated user",
    });
  } catch (error) {
    console.error("Error creating image:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create image",
      },
      { status: 400 }
    );
  }
}
