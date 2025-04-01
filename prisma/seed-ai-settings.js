const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedAISettings() {
  console.log("Seeding default AI settings...");

  // Define default AI settings
  const defaultSettings = [
    { key: "ai_provider", value: "gemini" },
    { key: "gemini_api_key", value: process.env.GEMINI_API_KEY || "" },
    {
      key: "gemini_model",
      value: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    },
    { key: "openai_api_key", value: process.env.OPENAI_API_KEY || "" },
    { key: "openai_model", value: process.env.OPENAI_MODEL || "gpt-4" },
    { key: "grok_api_key", value: process.env.GROK_API_KEY || "" },
    {
      key: "grok_api_endpoint",
      value: process.env.GROK_API_ENDPOINT || "https://api.grok.x.com/v1",
    },
    { key: "grok_model", value: process.env.GROK_MODEL || "grok-2-latest" },
    { key: "claude_api_key", value: process.env.CLAUDE_API_KEY || "" },
    {
      key: "claude_api_endpoint",
      value: process.env.CLAUDE_API_ENDPOINT || "https://api.anthropic.com/v1",
    },
    {
      key: "claude_model",
      value: process.env.CLAUDE_MODEL || "claude-3-opus-20240229",
    },
  ];

  // Create or update settings
  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value },
    });
  }

  console.log("AI settings seeded successfully!");
}

async function main() {
  try {
    await seedAISettings();
  } catch (error) {
    console.error("Error seeding AI settings:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
