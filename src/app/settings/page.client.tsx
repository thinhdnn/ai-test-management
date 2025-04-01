"use client";

import { useState } from "react";
import { SaveButton } from "@/components/save-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface SettingsProps {
  settings: Record<string, string>;
}

export function SettingsClient({ settings }: SettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(settings);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // API call to save settings
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Could not save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCheckboxChange = (key: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [key]: checked.toString() }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Application Settings</CardTitle>
            <CardDescription>
              Configure basic options for the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="app_name"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Application Name
                </label>
                <input
                  id="app_name"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.app_name || ""}
                  onChange={(e) => handleChange("app_name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="app_url"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Application URL
                </label>
                <input
                  id="app_url"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.app_url || ""}
                  onChange={(e) => handleChange("app_url", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <SaveButton
              className="ml-auto"
              onClick={handleSave}
              isLoading={isSaving}
              saveText="Save Settings"
            />
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Interface</CardTitle>
            <CardDescription>
              Customize the application interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="language"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Language
                </label>
                <select
                  id="language"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.language || "en"}
                  onChange={(e) => handleChange("language", e.target.value)}
                >
                  <option value="vi">Vietnamese</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="dark-mode"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={formData.dark_mode === "true"}
                  onChange={(e) =>
                    handleCheckboxChange("dark_mode", e.target.checked)
                  }
                />
                <label
                  htmlFor="dark-mode"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Dark Mode
                </label>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <SaveButton
              className="ml-auto"
              onClick={handleSave}
              isLoading={isSaving}
              saveText="Save Settings"
            />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
