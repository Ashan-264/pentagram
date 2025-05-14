import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET() {
  try {
    const vercelToken = process.env.BLOB_READ_WRITE_TOKEN;
    const blobsArr = await list({
      prefix: "pentagram/",
      token: vercelToken, // Ensure this is set in your environment
    });

    const imageUrls = blobsArr.blobs
      .filter(blob => /\.(jpg|jpeg|png|gif|webp)$/i.test(blob.pathname))
      .map(blob => blob.downloadUrl);
    //console.log("data: ", imageUrls);
    return NextResponse.json({
      imageURLs: imageUrls,
    });
  } catch (err) {
    console.error("Error fetching images: ", err);
    return NextResponse.json(
      { success: false, error: `Failed to get images error: ${err}` },
      { status: 500 }
    );
  }
}
