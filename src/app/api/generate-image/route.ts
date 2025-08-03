import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, user_id } = body;
    console.log(text);
    // TODO: Call your Image Generation API here
    // For now, we'll just echo back the text

    // const apiSecret = request.headers.get("X-API-KEY");
    // if (apiSecret != process.env.API_SECRET) {
    //   return NextResponse.json({ error: "unauthroized" }, { status: 401 });
    // }
    // the above is not secure enough
    const url = new URL(
      //"https://ashan-264--sd-image-generator-model-generate.modal.run/"
      //"https://ashan-264--sd-image-generator-model-generate-dev.modal.run"
      "https://ashan-264--sd-image-generator-model-generate.modal.run"
    );
    url.searchParams.set("prompt", text);
    console.log("request url:", url.toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "X-API-KEY": process.env.API_KEY || "", Accept: "image/jpeg" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Response: ", errorText);

      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`
      );
    }

    const imageBuffer = await response.arrayBuffer();

    const filename = `${crypto.randomUUID()}.jpg`;
    //const blob = await put('folder/file.txt', 'Hello World!', { access: 'public' });

    const blob = await put(`pentagram/${filename}`, imageBuffer, {
      access: "public",
      contentType: "image/jpeg",
    });

    // Get or create default user if no user_id provided
    let finalUserId = user_id;
    if (!finalUserId) {
      const { data: defaultUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", "pentagram_system")
        .single();

      if (defaultUser) {
        finalUserId = defaultUser.id;
      } else {
        // Create default system user
        const { data: newUser, error: userError } = await supabase
          .from("users")
          .insert([{
            username: "pentagram_system",
            email: "system@pentagram.app",
            name: "Pentagram System"
          }])
          .select()
          .single();

        if (userError) {
          console.error("Failed to create default user:", userError);
        } else {
          finalUserId = newUser.id;
        }
      }
    }

    // Create database record for the new image
    let imageRecord = null;
    if (finalUserId) {
      try {
        const { data, error: dbError } = await supabase
          .from("images")
          .insert([{
            user_id: finalUserId,
            blob_name: filename,
            is_public: true
          }])
          .select(`
            *,
            users:user_id (
              username,
              name
            )
          `)
          .single();

        if (dbError) {
          console.error("Failed to create image record:", dbError);
        } else {
          imageRecord = data;
        }
      } catch (dbErr) {
        console.error("Database error:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      imageURL: blob.url,
      imageRecord: imageRecord,
      message: `Received: ${text}`,
    });
  } catch (error) {
    console.error("Error occurred:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
