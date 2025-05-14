import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;
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

    return NextResponse.json({
      success: true,
      imageURL: blob.url,
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
