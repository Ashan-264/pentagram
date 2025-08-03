import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    let query = supabase
      .from("comments")
      .select(
        `
        *,
        users:user_id (
          username,
          name
        )
      `
      )
      .eq("image_id", imageId)
      .order("created_at", { ascending: true });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) throw error;

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
    const { data: imageExists } = await supabase
      .from("images")
      .select("id")
      .eq("id", image_id)
      .single();

    if (!imageExists) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
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
      .from("comments")
      .insert([{ image_id, user_id, comment_text }])
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
    const { data: existingComment, error: fetchError } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Comment not found" },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    if (existingComment.user_id !== user_id) {
      return NextResponse.json(
        { error: "Unauthorized to edit this comment" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("comments")
      .update({ comment_text })
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

    if (error) throw error;

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
    const { data: existingComment, error: fetchError } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Comment not found" },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    if (existingComment.user_id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to delete this comment" },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("comments").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
