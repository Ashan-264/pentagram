import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includePrivate = searchParams.get("includePrivate") === "true";
    const userId = searchParams.get("userId");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    // Build query for database images
    let query = supabase
      .from("images")
      .select(`
        *,
        users:user_id (
          username,
          name
        )
      `)
      .order("upload_date", { ascending: false });

    // Filter by visibility
    if (!includePrivate) {
      query = query.eq("is_public", true);
    }

    // Filter by user
    if (userId) {
      query = query.eq("user_id", userId);
    }

    // Pagination
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    if (offset && limit) {
      query = query.range(
        parseInt(offset),
        parseInt(offset) + parseInt(limit) - 1
      );
    }

    const { data: dbImages, error } = await query;

    if (error) throw error;

    // Get Vercel blob list to construct download URLs
    const vercelToken = process.env.BLOB_READ_WRITE_TOKEN;
    const blobsArr = await list({
      prefix: "pentagram/",
      token: vercelToken,
    });

    // Create a map of blob names to download URLs
    const blobUrlMap = new Map();
    blobsArr.blobs.forEach(blob => {
      const blobName = blob.pathname.replace("pentagram/", "");
      blobUrlMap.set(blobName, blob.downloadUrl);
    });

    // Combine database records with blob URLs
    const imagesWithUrls = dbImages?.map(image => ({
      ...image,
      downloadUrl: blobUrlMap.get(image.blob_name),
      // Keep legacy format for backward compatibility
      imageURL: blobUrlMap.get(image.blob_name)
    })) || [];

    // Filter out images that don't have corresponding blobs
    const validImages = imagesWithUrls.filter(img => img.downloadUrl);

    // Get like and comment counts for each image
    const imageIds = validImages.map(img => img.id);
    
    const [likeCounts, commentCounts] = await Promise.all([
      // Get like counts
      supabase
        .from("likes")
        .select("image_id")
        .in("image_id", imageIds),
      
      // Get comment counts
      supabase
        .from("comments")
        .select("image_id")
        .in("image_id", imageIds)
    ]);

    // Create count maps
    const likeCountMap = new Map();
    const commentCountMap = new Map();

    likeCounts.data?.forEach(like => {
      likeCountMap.set(like.image_id, (likeCountMap.get(like.image_id) || 0) + 1);
    });

    commentCounts.data?.forEach(comment => {
      commentCountMap.set(comment.image_id, (commentCountMap.get(comment.image_id) || 0) + 1);
    });

    // Add counts to images
    const finalImages = validImages.map(image => ({
      ...image,
      likeCount: likeCountMap.get(image.id) || 0,
      commentCount: commentCountMap.get(image.id) || 0
    }));

    return NextResponse.json({
      success: true,
      images: finalImages,
      // Legacy format for backward compatibility
      imageURLs: finalImages.map(img => img.downloadUrl),
      total: finalImages.length
    });
  } catch (err) {
    console.error("Error fetching images: ", err);
    return NextResponse.json(
      { success: false, error: `Failed to get images error: ${err}` },
      { status: 500 }
    );
  }
}
