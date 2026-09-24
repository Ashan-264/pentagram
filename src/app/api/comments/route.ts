import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const withUser = { users: { select: { username: true, name: true } } };

// GET /api/comments - Get comments for an image
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

    const data = await prisma.comment.findMany({
      where: { image_id: imageId, ...(userId ? { user_id: userId } : {}) },
      include: withUser,
      orderBy: { created_at: "asc" },
    });

    return NextResponse.json({ comments: data });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/comments - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const { image_id, user_id, comment_text } = await request.json();

    if (!image_id || !user_id || !comment_text) {
      return NextResponse.json(
        { error: "Image ID, user ID, and comment text are required" },
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

    const data = await prisma.comment.create({
      data: { image_id, user_id, comment_text },
      include: withUser,
    });

    return NextResponse.json(
      {
        success: true,
        comment: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}

// PUT /api/comments - Update a comment
export async function PUT(request: NextRequest) {
  try {
    const { id, comment_text, user_id } = await request.json();

    if (!id || !comment_text || !user_id) {
      return NextResponse.json(
        { error: "Comment ID, comment text, and user ID are required" },
        { status: 400 }
      );
    }

    // Verify the comment belongs to the user
    const existingComment = await prisma.comment.findUnique({
      where: { id },
      select: { user_id: true },
    });

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (existingComment.user_id !== user_id) {
      return NextResponse.json(
        { error: "Unauthorized to edit this comment" },
        { status: 403 }
      );
    }

    const data = await prisma.comment.update({
      where: { id },
      data: { comment_text },
      include: withUser,
    });

    return NextResponse.json({ comment: data });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

// DELETE /api/comments - Delete a comment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id || !userId) {
      return NextResponse.json(
        { error: "Comment ID and user ID are required" },
        { status: 400 }
      );
    }

    // Verify the comment belongs to the user
    const existingComment = await prisma.comment.findUnique({
      where: { id },
      select: { user_id: true },
    });

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (existingComment.user_id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to delete this comment" },
        { status: 403 }
      );
    }

    await prisma.comment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
