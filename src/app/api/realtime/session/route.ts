import { NextRequest, NextResponse } from "next/server";
import { voiceAIConfig } from "@/config/voiceAI";

export async function POST(request: NextRequest) {
  try {
    // Parse request body for optional voice override
    const body = await request.json().catch(() => ({}));
    const voice = body.voice || voiceAIConfig.voice;

    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: voiceAIConfig.model,
          voice: voice,
          instructions: voiceAIConfig.instructions,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
