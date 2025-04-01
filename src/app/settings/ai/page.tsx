import { prisma } from "@/lib/db";
import { AISettingsClient } from "./page.client";

// Fetch AI-related settings from database
async function getAISettings() {
  const aiSettingsData = await prisma.setting.findMany({
    where: {
      key: {
        in: [
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
        ],
      },
    },
  });

  // Convert array to object for easier access
  const settings: Record<string, string> = {};
  aiSettingsData.forEach((setting) => {
    settings[setting.key] = setting.value;
  });

  return settings;
}

export default async function AISettingsPage() {
  const settings = await getAISettings();

  return <AISettingsClient settings={settings} />;
}
