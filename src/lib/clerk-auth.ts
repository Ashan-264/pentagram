import { auth } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

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
 * Ensure user exists in the users table (create if doesn't exist)
 */
export async function ensureUserExists(
  userId: string,
  userEmail?: string,
  userName?: string
) {
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    // If user doesn't exist, create them
    if (!existingUser) {
      const newUser = {
        id: userId,
        username: userName || `user_${userId.slice(0, 8)}`,
        email: userEmail || `${userId}@example.com`,
        name: userName || "User",
        created_at: new Date(),
        updated_at: new Date(),
      };

      return await prisma.user.create({ data: newUser });
    }

    return existingUser;
  } catch (error) {
    console.error("Failed to ensure user exists:", error);
    throw error;
  }
}
