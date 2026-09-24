import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const withUser = { users: { select: { username: true, name: true } } };

// GET /api/likes - Get likes for an image
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");
    const userId = searchParams.get("userId");

    if (!imageId) {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 }
      );
    }

    const data = await prisma.like.findMany({
      where: { image_id: imageId },
      include: withUser,
    });

    // Check if current user has liked this image
    let userHasLiked = false;
    if (userId) {
      userHasLiked = data.some(like => like.user_id === userId);
    }

    return NextResponse.json({
      likes: data,
      count: data.length,
      userHasLiked,
    });
  } catch (error) {
    console.error("Error fetching likes:", error);
    return NextResponse.json(
      { error: "Failed to fetch likes" },
      { status: 500 }
    );
  }
}

// POST /api/likes - Toggle like/unlike for an image
export async function POST(request: NextRequest) {
  try {
    const { image_id, user_id } = await request.json();

    if (!image_id || !user_id) {
      return NextResponse.json(
        { error: "Image ID and user ID are required" },
        { status: 400 }
      );
    }

    // Verify image exists
    const imageExists = await prisma.image.findUnique({
      where: { id: image_id },
      select: { id: true },
    });

    if (!imageExists) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Verify user exists
    const userExists = await prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has already liked this image
    const existingLike = await prisma.like.findUnique({
      where: { image_id_user_id: { image_id, user_id } },
      select: { id: true },
    });

    let liked = false;
    let likeData = null;

    if (existingLike) {
      // Unlike - remove the like
      await prisma.like.delete({ where: { id: existingLike.id } });
      liked = false;
    } else {
      // Like - add the like
      likeData = await prisma.like.create({
        data: { image_id, user_id },
        include: withUser,
      });
      liked = true;
    }

    // Get updated like count
    const count = await prisma.like.count({ where: { image_id } });

    return NextResponse.json({
      success: true,
      liked,
      count,
      like: likeData,
    });
  } catch (error) {
    console.error("Error handling like:", error);
    return NextResponse.json(
      { error: "Failed to process like" },
      { status: 500 }
    );
  }
}

// DELETE /api/likes - Remove a specific like (alternative to POST toggle)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");
    const userId = searchParams.get("userId");

    if (!imageId || !userId) {
      return NextResponse.json(
        { error: "Image ID and user ID are required" },
        { status: 400 }
      );
    }

    await prisma.like.deleteMany({
      where: { image_id: imageId, user_id: userId },
    });

    // Get updated like count
    const count = await prisma.like.count({ where: { image_id: imageId } });

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error deleting like:", error);
    return NextResponse.json(
      { error: "Failed to delete like" },
      { status: 500 }
    );
  }
}
