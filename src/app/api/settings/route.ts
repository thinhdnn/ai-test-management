import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resetAIProvider } from "@/lib/ai-provider";

// GET handler to fetch all settings
export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.setting.findMany();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT handler to update settings
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();

    // Process and save each setting
    for (const [key, value] of Object.entries(data)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      });
    }

    // If we're updating AI settings, reset the AI provider
    const aiRelatedKeys = [
      "ai_provider",
      "gemini_api_key",
      "gemini_model",
      "openai_api_key",
      "openai_model",
      "grok_api_key",
      "grok_api_endpoint",
      "grok_model",
      "claude_api_key",
      "claude_api_endpoint",
      "claude_model",
    ];

    const hasAISettingsChange = Object.keys(data).some((key) =>
      aiRelatedKeys.includes(key)
    );

    if (hasAISettingsChange) {
      resetAIProvider();
      console.log(
        "[Settings API] AI settings changed, provider has been reset"
      );
    }

    return NextResponse.json({ message: "Settings updated successfully" });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { message: "Failed to update settings" },
      { status: 500 }
    );
  }
}
