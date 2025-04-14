"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STATUS_OPTIONS, TAG_OPTIONS } from "@/lib/utils";
import { useState, FormEvent, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePermission } from "@/lib/hooks/usePermission";

export default function NewTestCasePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { hasPermission } = usePermission();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);
  const [newTag, setNewTag] = useState({ value: "", label: "" });
  const [customTags, setCustomTags] = useState<Array<{ value: string, label: string }>>([]);

  // Kiểm tra quyền khi component được tải
  useEffect(() => {
    if (!hasPermission("testcase.create")) {
      toast.error("You don't have permission to create test cases");
      router.push(`/projects/${projectId}/test-cases`);
    }
  }, [hasPermission, projectId, router]);

  // Load custom tags when component mounts
  useEffect(() => {
    const loadCustomTags = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/tags`);
        if (response.ok) {
          const tags = await response.json();
          setCustomTags(tags);
        }
      } catch (error) {
        console.error("Error loading custom tags:", error);
      }
    };
    
    loadCustomTags();
  }, [projectId]);

  // Combine built-in tags with custom tags
  const allTags = [...TAG_OPTIONS, ...customTags];

  // Add function to create new tag
  const handleCreateTag = async () => {
    try {
      setIsSubmitting(true);
      
      // Format tag value with @ prefix if not present
      const tagValue = newTag.value.startsWith('@') ? newTag.value : `@${newTag.value}`;
      
      const response = await fetch(`/api/projects/${projectId}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value: tagValue,
          label: newTag.label || tagValue.replace('@', '')
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create tag");
      }

      const createdTag = await response.json();
      setCustomTags(prev => [...prev, createdTag]);
      
      // Reset form and close dialog
      setNewTag({ value: "", label: "" });
      setIsCreateTagOpen(false);
      
      toast.success("Tag created successfully");
    } catch (error) {
      console.error("Error creating tag:", error);
      toast.error("Failed to create tag");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Kiểm tra quyền trước khi submit
    if (!hasPermission("testcase.create")) {
      toast.error("You don't have permission to create test cases");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const originalName = formData.get("name") as string;

    try {
      // Call the spell check API endpoint to correct the name
      const spellCheckResponse = await fetch("/api/ai/spell-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: originalName }),
      });

      const spellCheckData = await spellCheckResponse.json();
      const correctedName = spellCheckData.correctedText || originalName;

      // Convert selected tags to array with @ prefix
      const formattedTags = selectedTags.map(tag => `@${tag}`);

      const formValues = {
        name: correctedName,
        description: formData.get("description") as string,
        status: formData.get("status") as string,
        tags: formattedTags,
        isManual: formData.get("isManual") === "on",
      };

      // Call API to create test case
      const response = await fetch(`/api/projects/${projectId}/test-cases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error creating test case");
      }

      // Redirect user to project detail page after successful creation
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error creating test case:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while creating the test case. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagChange = (tag: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedTags((prev) => [...prev, tag]);
    } else {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    }
  };

  // Add keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to submit the form
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.querySelector('form') as HTMLFormElement;
        if (form && !isSubmitting) {
          form.requestSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting]);

  return (
    <div className="container mx-auto py-4">
      <Card className="mx-auto mt-2 max-w-3xl">
        <CardHeader>
          <CardTitle>Test Case Information</CardTitle>
          <CardDescription>
            Enter details to create a new test case
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="description"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="isManual" name="isManual" />
              <label
                htmlFor="isManual"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Manual Test Case (No Playwright Code Generation)
              </label>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="status"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                  defaultValue="pending"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="tags"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Tags
                </label>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2 border rounded-md p-4">
                    {allTags.map((tag) => (
                      <div
                        key={tag.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`tag-${tag.value}`}
                          checked={selectedTags.includes(tag.value.replace('@', ''))}
                          onCheckedChange={(checked) =>
                            handleTagChange(tag.value.replace('@', ''), checked === true)
                          }
                        />
                        <label
                          htmlFor={`tag-${tag.value}`}
                          className={`text-sm font-medium leading-none cursor-pointer ${
                            tag.value.includes("@high") || tag.value.includes("@fast")
                              ? "text-green-600"
                              : tag.value.includes("@medium") || tag.value.includes("@slow")
                              ? "text-yellow-600"
                              : tag.value.includes("@low") || tag.value.includes("@critical")
                              ? "text-red-600"
                              : "text-blue-600"
                          }`}
                        >
                          {tag.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateTagOpen(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Tag
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="submit" isLoading={isSubmitting}>
                Create Test Case
              </Button>
              <div className="text-xs text-muted-foreground self-center">
                Press <kbd className="px-1 py-0.5 text-xs border rounded-md">Ctrl+Enter</kbd> to submit
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Create Tag Dialog */}
      <Dialog open={isCreateTagOpen} onOpenChange={setIsCreateTagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
            <DialogDescription>
              Add a new tag to use in test cases
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleCreateTag(); }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tagValue">Tag Value</Label>
                <Input
                  id="tagValue"
                  placeholder="e.g. critical (without @)"
                  value={newTag.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(prev => ({ ...prev, value: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tagLabel">Display Label (Optional)</Label>
                <Input
                  id="tagLabel"
                  placeholder="e.g. Critical Priority"
                  value={newTag.label}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateTagOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !newTag.value.trim()}
              >
                {isSubmitting ? "Creating..." : "Create Tag"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
