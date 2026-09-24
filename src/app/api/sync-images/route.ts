import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { force = false } = await request.json();

    // First, create or get a default user for existing images
    let defaultUser;
    const existingUser = await prisma.user.findUnique({
      where: { username: "pentagram_system" },
      select: { id: true },
    });

    if (existingUser) {
      defaultUser = existingUser;
    } else {
      // Create default system user
      defaultUser = await prisma.user.create({
        data: {
          username: "pentagram_system",
          email: "system@pentagram.app",
          name: "Pentagram System",
        },
      });
    }

    // Get all images from Vercel blob
    const vercelToken = process.env.BLOB_READ_WRITE_TOKEN;
    const blobsArr = await list({
      prefix: "pentagram/",
      token: vercelToken,
    });

    const imageBlobs = blobsArr.blobs.filter(blob =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(blob.pathname)
    );

    console.log(`Found ${imageBlobs.length} images in Vercel blob`);

    // Get existing images from database to avoid duplicates
    const existingImages = await prisma.image.findMany({
      select: { blob_name: true },
    });

    const existingBlobNames = new Set(existingImages.map(img => img.blob_name));

    const newImages = [];
    let skipped = 0;
    let created = 0;

    for (const blob of imageBlobs) {
      // Extract filename from pathname (remove "pentagram/" prefix)
      const blobName = blob.pathname.replace("pentagram/", "");

      if (!force && existingBlobNames.has(blobName)) {
        skipped++;
        continue;
      }

      // Create database record for this image
      try {
        const imageRecord = await prisma.image.create({
          data: {
            user_id: defaultUser.id,
            blob_name: blobName,
            is_public: true, // Default to public as requested
            upload_date: blob.uploadedAt,
          },
          include: { users: { select: { username: true, name: true } } },
        });

        newImages.push({
          ...imageRecord,
          downloadUrl: blob.downloadUrl,
        });
        created++;
      } catch (err) {
        console.error(`Failed to process ${blobName}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalBlobImages: imageBlobs.length,
        newRecordsCreated: created,
        skipped: skipped,
        defaultUserId: defaultUser.id,
      },
      newImages: newImages,
    });
  } catch (error) {
    console.error("Error syncing images:", error);
    return NextResponse.json(
      {
        error: "Failed to sync images",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET() {
  try {
    // Get counts from both sources
    const vercelToken = process.env.BLOB_READ_WRITE_TOKEN;
    const blobsArr = await list({
      prefix: "pentagram/",
      token: vercelToken,
    });

    const blobImageCount = blobsArr.blobs.filter(blob =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(blob.pathname)
    ).length;

    const dbImageCount = await prisma.image.count();

    return NextResponse.json({
      vercelBlobImages: blobImageCount,
      databaseImages: dbImageCount || 0,
      needsSync: blobImageCount > (dbImageCount || 0),
    });
  } catch (error) {
    console.error("Error checking sync status:", error);
    return NextResponse.json(
      { error: "Failed to check sync status" },
      { status: 500 }
    );
  }
}
