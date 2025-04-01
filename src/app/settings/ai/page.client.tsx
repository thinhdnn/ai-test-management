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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AISettingsProps {
  settings: Record<string, string>;
}

export function AISettingsClient({ settings }: AISettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(settings);
  const [activeAiProvider, setActiveAiProvider] = useState(
    formData.ai_provider || "gemini"
  );

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

      toast.success("AI settings saved successfully");
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

  const handleAiProviderChange = (provider: string) => {
    setActiveAiProvider(provider);
    handleChange("ai_provider", provider);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>AI Configuration</CardTitle>
            <CardDescription>
              Configure AI providers and API keys for test generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium leading-none mb-2 block">
                  Active AI Provider
                </label>
                <Tabs
                  defaultValue={activeAiProvider}
                  className="w-full"
                  onValueChange={handleAiProviderChange}
                >
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="gemini">Gemini</TabsTrigger>
                    <TabsTrigger value="gpt">GPT</TabsTrigger>
                    <TabsTrigger value="grok">Grok</TabsTrigger>
                    <TabsTrigger value="claude">Claude</TabsTrigger>
                  </TabsList>

                  <TabsContent value="gemini" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="gemini_api_key"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Gemini API Key
                      </label>
                      <input
                        id="gemini_api_key"
                        type="password"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.gemini_api_key || ""}
                        onChange={(e) =>
                          handleChange("gemini_api_key", e.target.value)
                        }
                        placeholder="Enter your Gemini API key"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="gemini_model"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Gemini Model
                      </label>
                      <select
                        id="gemini_model"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.gemini_model || "gemini-1.5-pro"}
                        onChange={(e) =>
                          handleChange("gemini_model", e.target.value)
                        }
                      >
                        <option value="gemini-2.0-flash">
                          Gemini 2.0 Flash
                        </option>
                        <option value="gemini-2.0-flash-lite">
                          Gemini 2.0 Flash-Lite
                        </option>
                        <option value="gemini-2.0-pro-exp-02-05">
                          Gemini 2.0 Pro Experimental
                        </option>
                        <option value="gemini-1.5-flash">
                          Gemini 1.5 Flash
                        </option>
                        <option value="gemini-1.5-flash-8b">
                          Gemini 1.5 Flash-8B
                        </option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-embedding-exp">
                          Gemini Embedding
                        </option>
                        <option value="imagen-3.0-generate-002">
                          Imagen 3
                        </option>
                      </select>
                    </div>
                  </TabsContent>

                  <TabsContent value="gpt" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="openai_api_key"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        OpenAI API Key
                      </label>
                      <input
                        id="openai_api_key"
                        type="password"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.openai_api_key || ""}
                        onChange={(e) =>
                          handleChange("openai_api_key", e.target.value)
                        }
                        placeholder="Enter your OpenAI API key"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="openai_model"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        OpenAI Model
                      </label>
                      <select
                        id="openai_model"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.openai_model || "gpt-4"}
                        onChange={(e) =>
                          handleChange("openai_model", e.target.value)
                        }
                      >
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </select>
                    </div>
                  </TabsContent>

                  <TabsContent value="grok" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="grok_api_key"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Grok API Key
                      </label>
                      <input
                        id="grok_api_key"
                        type="password"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.grok_api_key || ""}
                        onChange={(e) =>
                          handleChange("grok_api_key", e.target.value)
                        }
                        placeholder="Enter your Grok API key"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="grok_api_endpoint"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Grok API Endpoint
                      </label>
                      <input
                        id="grok_api_endpoint"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={
                          formData.grok_api_endpoint || "https://api.x.ai/v1"
                        }
                        onChange={(e) =>
                          handleChange("grok_api_endpoint", e.target.value)
                        }
                        placeholder="Enter Grok API endpoint"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="grok_model"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Grok Model
                      </label>
                      <select
                        id="grok_model"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.grok_model || "grok-2"}
                        onChange={(e) =>
                          handleChange("grok_model", e.target.value)
                        }
                      >
                        <optgroup label="Text Models">
                          <option value="grok-2-latest">Grok 2 (Latest)</option>
                          <option value="grok-2">Grok 2</option>
                          <option value="grok-2-1212">Grok 2 (1212)</option>
                        </optgroup>
                        <optgroup label="Vision Models">
                          <option value="grok-2-vision-latest">
                            Grok 2 Vision (Latest)
                          </option>
                          <option value="grok-2-vision">Grok 2 Vision</option>
                          <option value="grok-2-vision-1212">
                            Grok 2 Vision (1212)
                          </option>
                        </optgroup>
                        <option value="grok-3">Grok 3</option>
                        <option value="grok-1.5">Grok 1.5</option>
                        <option value="grok-1">Grok 1</option>
                      </select>
                    </div>
                  </TabsContent>

                  <TabsContent value="claude" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="claude_api_key"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Anthropic API Key
                      </label>
                      <input
                        id="claude_api_key"
                        type="password"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.claude_api_key || ""}
                        onChange={(e) =>
                          handleChange("claude_api_key", e.target.value)
                        }
                        placeholder="Enter your Anthropic API key"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="claude_model"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Claude Model
                      </label>
                      <select
                        id="claude_model"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={
                          formData.claude_model || "claude-3-opus-20240229"
                        }
                        onChange={(e) =>
                          handleChange("claude_model", e.target.value)
                        }
                      >
                        <option value="claude-3-opus-20240229">
                          Claude 3 Opus
                        </option>
                        <option value="claude-3-sonnet-20240229">
                          Claude 3 Sonnet
                        </option>
                        <option value="claude-3-haiku-20240307">
                          Claude 3 Haiku
                        </option>
                        <option value="claude-2.1">Claude 2.1</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="claude_api_endpoint"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Claude API Endpoint
                      </label>
                      <input
                        id="claude_api_endpoint"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={
                          formData.claude_api_endpoint ||
                          "https://api.anthropic.com/v1"
                        }
                        onChange={(e) =>
                          handleChange("claude_api_endpoint", e.target.value)
                        }
                        placeholder="Enter Claude API endpoint"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <SaveButton
              className="ml-auto"
              onClick={handleSave}
              isLoading={isSaving}
              saveText="Save AI Settings"
            />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
