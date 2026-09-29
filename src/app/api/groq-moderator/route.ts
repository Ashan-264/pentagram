import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

let client: Groq | null = null;

// Created on first use: constructing the client at module scope makes the
// build fail when GROQ_API_KEY is not present in the build environment.
const getClient = (): Groq => {
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
};

export async function POST(req: NextRequest) {
  try {
    const client = getClient();
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { success: false, error: "No text provided." },
        { status: 400 }
      );
    }

    const chatCompletion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are the best PG-13 moderator who checks if image generation prompts are safe or unsafe and simply reply with 'safe' or 'unsafe' (if unsafe, give two words explaining why).",
        },
        {
          role: "user",
          content: text,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });

    const result = chatCompletion.choices[0]?.message?.content;

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Moderation returned an empty response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, result: result });
  } catch (error) {
    console.error("Error in Groq LLM API:", error);
    const errorMessage =
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: string }).message
        : undefined;
    return NextResponse.json(
      { success: false, error: errorMessage || "Internal Server Error" },
      { status: 500 }
    );
  }
}
