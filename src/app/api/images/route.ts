import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/** Parse a query-string integer, returning null when it is absent or invalid. */
const parsePositiveInt = (value: string | null, min: number): number | null => {
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= min ? parsed : null;
};

const DEFAULT_PAGE_SIZE = 10;

// GET /api/images - Get images with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
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

    // Unparseable values are ignored rather than passed through as NaN, which
    // PostgREST rejects with a 400.
    const limitValue = parsePositiveInt(limit, 1);
    const offsetValue = parsePositiveInt(offset, 0);

    if (offsetValue !== null) {
      // range() already bounds the row count, so limit() is not also applied.
      const pageSize = limitValue ?? DEFAULT_PAGE_SIZE;
      query = query.range(offsetValue, offsetValue + pageSize - 1);
    } else if (limitValue !== null) {
      query = query.limit(limitValue);
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
    const supabase = getSupabase();
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
    const supabase = getSupabase();
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
    const supabase = getSupabase();
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
