import { auth } from "@clerk/nextjs/server";
import { supabase, createAuthenticatedSupabaseClient } from "./supabase";
import { NextRequest } from "next/server";

/**
 * Get authenticated Supabase client from Clerk token in API routes
 */
export async function getAuthenticatedSupabaseFromRequest(
  request: NextRequest
) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("No valid authorization header found");
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    return createAuthenticatedSupabaseClient(token);
  } catch (error) {
    console.error("Failed to create authenticated Supabase client:", error);
    throw error;
  }
}

/**
 * Get current user info from Clerk in API routes
 */
export async function getCurrentUser() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("User not authenticated");
    }
    return { userId };
  } catch (error) {
    console.error("Failed to get current user:", error);
    throw error;
  }
}

/**
 * Get user ID from Clerk JWT token directly
 */
export function getUserIdFromToken(token: string): string | null {
  try {
    // Decode JWT payload (this is just the payload, not verification)
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || null;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
}

/**
 * Ensure user exists in Supabase users table (create if doesn't exist)
 */
export async function ensureUserExists(
  userId: string,
  userEmail?: string,
  userName?: string
) {
  try {
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw fetchError;
    }

    // If user doesn't exist, create them
    if (!existingUser) {
      const newUser = {
        id: userId,
        username: userName || `user_${userId.slice(0, 8)}`,
        email: userEmail || `${userId}@example.com`,
        name: userName || "User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error: createError } = await supabase
        .from("users")
        .insert([newUser])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return data;
    }

    return existingUser;
  } catch (error) {
    console.error("Failed to ensure user exists:", error);
    throw error;
  }
}
