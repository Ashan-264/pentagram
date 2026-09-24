import { NextResponse } from "next/server";
import { getCurrentUser, ensureUserExists } from "../../../lib/clerk-auth";
import { prisma } from "@/lib/prisma";

/**
 * Example API route showing Clerk authentication with the Prisma database
 */

export async function GET() {
  try {
    // Get user from Clerk server-side auth
    const { userId } = await getCurrentUser();

    // Ensure user exists in our database
    const user = await ensureUserExists(userId);

    // Queries are scoped to the authenticated user
    const userImages = await prisma.image.findMany({
      where: { user_id: userId },
    });

    return NextResponse.json({
      success: true,
      user: user,
      images: userImages,
      message: "Successfully fetched user data with Clerk + Prisma",
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

export async function POST() {
  try {
    const { userId } = await getCurrentUser();

    // Parse request body
    //const body = await request.json();
    //const { title, description } = body;

    // Example: Create a new image record
    const newImage = await prisma.image.create({
      data: {
        user_id: userId,
        blob_name: `example-${Date.now()}.jpg`,
        is_public: true,
        upload_date: new Date(),
      },
    });

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
