import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai-provider";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Get AI provider and fix spelling/grammar
    const aiProvider = await getAIProvider();
    const correctedText = await aiProvider.fixTestCaseName(text);

    return NextResponse.json({ correctedText });
  } catch (error) {
    console.error("Error in spell check API:", error);
    return NextResponse.json(
      { error: "Failed to check spelling", original: body?.text || "" },
      { status: 500 }
    );
  }
}
