import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
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

    const result = chatCompletion.choices[0].message.content;

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
