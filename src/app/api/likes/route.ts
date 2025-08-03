import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    const query = supabase
      .from("likes")
      .select(
        `
        *,
        users:user_id (
          username,
          name
        )
      `
      )
      .eq("image_id", imageId);

    const { data, error } = await query;

    if (error) throw error;

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

    // Check if user has already liked this image
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("image_id", image_id)
      .eq("user_id", user_id)
      .single();

    let liked = false;
    let likeData = null;

    if (existingLike) {
      // Unlike - remove the like
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("id", existingLike.id);

      if (error) throw error;
      liked = false;
    } else {
      // Like - add the like
      const { data, error } = await supabase
        .from("likes")
        .insert([{ image_id, user_id }])
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
      liked = true;
      likeData = data;
    }

    // Get updated like count
    const { data: allLikes } = await supabase
      .from("likes")
      .select("id")
      .eq("image_id", image_id);

    return NextResponse.json({
      success: true,
      liked,
      count: allLikes?.length || 0,
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

    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("image_id", imageId)
      .eq("user_id", userId);

    if (error) throw error;

    // Get updated like count
    const { data: allLikes } = await supabase
      .from("likes")
      .select("id")
      .eq("image_id", imageId);

    return NextResponse.json({
      success: true,
      count: allLikes?.length || 0,
    });
  } catch (error) {
    console.error("Error deleting like:", error);
    return NextResponse.json(
      { error: "Failed to delete like" },
      { status: 500 }
    );
  }
}
