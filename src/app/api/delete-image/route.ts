import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { supabase } from "@/lib/supabase";

export async function DELETE(request: Request) {
  try {
    const { url, imageId, userId } = await request.json();

    if (!url && !imageId) {
      return NextResponse.json(
        { success: false, error: "Image URL or Image ID is required" },
        { status: 400 }
      );
    }

    let imageRecord = null;
    const blobUrl = url;

    // If imageId is provided, get the image record from database
    if (imageId) {
      const { data, error } = await supabase
        .from("images")
        .select("*")
        .eq("id", imageId)
        .single();

      if (error) {
        return NextResponse.json(
          { success: false, error: "Image not found in database" },
          { status: 404 }
        );
      }

      imageRecord = data;

      // Check if user has permission to delete (if userId provided)
      if (userId && imageRecord.user_id !== userId) {
        return NextResponse.json(
          { success: false, error: "Unauthorized to delete this image" },
          { status: 403 }
        );
      }

      // Delete by blob path if URL not provided
      if (!blobUrl) {
        // Use blob path for deletion
        const vercelToken = process.env.BLOB_READ_WRITE_TOKEN;
        const blobPath = `pentagram/${imageRecord.blob_name}`;
        
        await del(blobPath, { token: vercelToken });
      }
    }

    // Delete the blob from Vercel
    if (blobUrl) {
      await del(blobUrl);
    }

    // Delete from database if we have the record
    if (imageRecord) {
      const { error: dbError } = await supabase
        .from("images")
        .delete()
        .eq("id", imageRecord.id);

      if (dbError) {
        console.error("Failed to delete from database:", dbError);
        // Continue with success since blob was deleted
      }
    } else if (url) {
      // Try to find and delete database record by blob name
      const blobName = url.split("/").pop()?.split("?")[0];
      if (blobName) {
        await supabase
          .from("images")
          .delete()
          .eq("blob_name", blobName);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting image: ", err);
    return NextResponse.json(
      { success: false, error: `Failed to delete image: ${err}` },
      { status: 500 }
    );
  }
}
