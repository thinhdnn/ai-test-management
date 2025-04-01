import { prisma } from "@/lib/db";
import { SettingsClient } from "./page.client";

// Fetch settings from database
async function getSettings() {
  const settingsData = await prisma.setting.findMany();

  // Convert array to object for easier access
  const settings: Record<string, string> = {};
  settingsData.forEach((setting) => {
    settings[setting.key] = setting.value;
  });

  return settings;
}

export default async function SettingsPage() {
  const settings = await getSettings();

  return <SettingsClient settings={settings} />;
}
