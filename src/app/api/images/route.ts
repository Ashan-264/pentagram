import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const withUser = { users: { select: { username: true, name: true } } };

// GET /api/images - Get images with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const isPublic = searchParams.get("isPublic");
    const id = searchParams.get("id");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    if (id) {
      const data = await prisma.image.findUnique({
        where: { id },
        include: withUser,
      });

      if (!data) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
      }

      return NextResponse.json({ image: data });
    }

    const data = await prisma.image.findMany({
      where: {
        ...(userId ? { user_id: userId } : {}),
        ...(isPublic !== null ? { is_public: isPublic === "true" } : {}),
      },
      include: withUser,
      orderBy: { upload_date: "desc" },
      take: offset
        ? parseInt(limit || "10")
        : limit
          ? parseInt(limit)
          : undefined,
      skip: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json({ images: data });
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

// POST /api/images - Create a new image record
export async function POST(request: NextRequest) {
  try {
    const { user_id, blob_name, is_public = true } = await request.json();

    if (!user_id || !blob_name) {
      return NextResponse.json(
        { error: "User ID and blob name are required" },
        { status: 400 }
      );
    }

    // Verify user exists
    const userExists = await prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data = await prisma.image.create({
      data: { user_id, blob_name, is_public },
      include: withUser,
    });

    return NextResponse.json({ image: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating image:", error);
    return NextResponse.json(
      { error: "Failed to create image record" },
      { status: 500 }
    );
  }
}

// PUT /api/images - Update an image record
export async function PUT(request: NextRequest) {
  try {
    const { id, is_public } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 }
      );
    }

    const updates: { is_public?: boolean } = {};
    if (is_public !== undefined) updates.is_public = is_public;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "At least one field to update is required" },
        { status: 400 }
      );
    }

    const data = await prisma.image.update({
      where: { id },
      data: updates,
      include: withUser,
    });

    return NextResponse.json({ image: data });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    console.error("Error updating image:", error);
    return NextResponse.json(
      { error: "Failed to update image" },
      { status: 500 }
    );
  }
}

// DELETE /api/images - Delete an image record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 }
      );
    }

    await prisma.image.deleteMany({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
