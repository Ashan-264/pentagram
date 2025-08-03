import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/images - Get images with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const isPublic = searchParams.get("isPublic");
    const id = searchParams.get("id");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    let query = supabase
      .from("images")
      .select(
        `
        *,
        users:user_id (
          username,
          name
        )
      `
      )
      .order("upload_date", { ascending: false });

    if (id) {
      query = query.eq("id", id);
      const { data, error } = await query.single();

      if (error) {
        if (error.code === "PGRST116") {
          return NextResponse.json(
            { error: "Image not found" },
            { status: 404 }
          );
        }
        throw error;
      }

      return NextResponse.json({ image: data });
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (isPublic !== null) {
      query = query.eq("is_public", isPublic === "true");
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    if (offset) {
      query = query.range(
        parseInt(offset),
        parseInt(offset) + parseInt(limit || "10") - 1
      );
    }

    const { data, error } = await query;

    if (error) throw error;

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
    const { data: userExists } = await supabase
      .from("users")
      .select("id")
      .eq("id", user_id)
      .single();

    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("images")
      .insert([{ user_id, blob_name, is_public }])
      .select(
        `
        *,
        users:user_id (
          username,
          name
        )
      `
      )
      .single();

    if (error) throw error;

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

    const updates: any = {};
    if (is_public !== undefined) updates.is_public = is_public;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "At least one field to update is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("images")
      .update(updates)
      .eq("id", id)
      .select(
        `
        *,
        users:user_id (
          username,
          name
        )
      `
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ image: data });
  } catch (error) {
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

    const { error } = await supabase.from("images").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
