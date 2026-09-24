import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includePrivate = searchParams.get("includePrivate") === "true";
    const userId = searchParams.get("userId");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    // Build query for database images
    const dbImages = await prisma.image.findMany({
      where: {
        // Filter by visibility
        ...(!includePrivate ? { is_public: true } : {}),
        // Filter by user
        ...(userId ? { user_id: userId } : {}),
      },
      include: { users: { select: { username: true, name: true } } },
      orderBy: { upload_date: "desc" },
      // Pagination
      take: limit ? parseInt(limit) : undefined,
      skip: offset && limit ? parseInt(offset) : undefined,
    });

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
    const imagesWithUrls =
      dbImages?.map(image => ({
        ...image,
        downloadUrl: blobUrlMap.get(image.blob_name),
        // Keep legacy format for backward compatibility
        imageURL: blobUrlMap.get(image.blob_name),
      })) || [];

    // Filter out images that don't have corresponding blobs
    const validImages = imagesWithUrls.filter(img => img.downloadUrl);

    // Get like and comment counts for each image
    const imageIds = validImages.map(img => img.id);

    const [likeCounts, commentCounts] = await Promise.all([
      // Get like counts
      prisma.like.findMany({
        where: { image_id: { in: imageIds } },
        select: { image_id: true },
      }),

      // Get comment counts
      prisma.comment.findMany({
        where: { image_id: { in: imageIds } },
        select: { image_id: true },
      }),
    ]);

    // Create count maps
    const likeCountMap = new Map();
    const commentCountMap = new Map();

    likeCounts.forEach(like => {
      likeCountMap.set(
        like.image_id,
        (likeCountMap.get(like.image_id) || 0) + 1
      );
    });

    commentCounts.forEach(comment => {
      commentCountMap.set(
        comment.image_id,
        (commentCountMap.get(comment.image_id) || 0) + 1
      );
    });

    // Add counts to images
    const finalImages = validImages.map(image => ({
      ...image,
      likeCount: likeCountMap.get(image.id) || 0,
      commentCount: commentCountMap.get(image.id) || 0,
    }));

    return NextResponse.json({
      success: true,
      images: finalImages,
      // Legacy format for backward compatibility
      imageURLs: finalImages.map(img => img.downloadUrl),
      total: finalImages.length,
    });
  } catch (err) {
    console.error("Error fetching images: ", err);
    return NextResponse.json(
      { success: false, error: `Failed to get images error: ${err}` },
      { status: 500 }
    );
  }
}
