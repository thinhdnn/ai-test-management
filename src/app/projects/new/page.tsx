"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BROWSER_OPTIONS, ENVIRONMENT_OPTIONS } from "@/lib/utils";
import { usePermission } from "@/lib/hooks/usePermission";

export default function NewProjectPage() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    environment: "development",
    library: "",
  });

  // Kiểm tra quyền khi trang được tải
  useEffect(() => {
    if (!hasPermission("project.create")) {
      toast.error("You don't have permission to create projects");
      router.push("/projects");
    }
  }, [hasPermission, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Kiểm tra quyền trước khi gửi request
    if (!hasPermission("project.create")) {
      toast.error("You don't have permission to create projects");
      return;
    }

    // Basic validation
    if (!formData.name || !formData.url || !formData.environment) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsLoading(true);

      // Show loading notification
      toast.info("Creating project and initializing Playwright...", {
        description: "Please wait a moment",
      });

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create project");
      }

      const project = await response.json();
      
      // Update Playwright configuration
      try {
        const configData = {
          baseUrl: formData.url,
          testDir: "tests",
          browsers: { chromium: false, firefox: false, webkit: false, chrome: false },
          viewport: { width: 1920, height: 1080 },
          timeout: 30000,
          expectTimeout: 5000,
          retries: 0,
          workers: 1,
          ignoreHTTPSErrors: false,
          screenshot: "only-on-failure",
          video: "on",
          trace: "on-first-retry",
          outputDir: "test-results",
          colorScheme: "light",
          locale: "en-US",
          timezoneId: "Asia/Ho_Chi_Minh",
          fullyParallel: false,
          offline: false,
          reporters: [],
          reportFileNames: {}
        };
        
        const playwrightResponse = await fetch(`/api/projects/${project.id}/config`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(configData)
        });
        
        if (!playwrightResponse.ok) {
          toast.warning("Project created but failed to update Playwright config", {
            description: "You may need to update the configuration manually"
          });
        }
      } catch (configError) {
        console.error("Error updating Playwright config:", configError);
        toast.warning("Project created but failed to update Playwright config", {
          description: "You may need to update the configuration manually"
        });
      }

      // Show success notification
      toast.success("Project created successfully!", {
        description: `Project "${project.name}" has been created and is ready to use`,
      });

      // Redirect to project detail page
      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error("Error creating project:", error);
      // Show error notification
      toast.error("Failed to create project", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Create New Project
        </h1>
        <Button asChild variant="outline">
          <Link href="/projects">Back</Link>
        </Button>
      </div>

      <Card className="mx-auto mt-8 max-w-2xl">
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>
            Enter details to create a new project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="create-project-form"
            className="space-y-6"
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter project description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={handleInputChange}
                placeholder="https://example.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="environment">Environment</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(value) =>
                    handleSelectChange("environment", value)
                  }
                  required
                >
                  <SelectTrigger id="environment">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="library">Libraries (optional)</Label>
              <Input
                id="library"
                value={formData.library}
                onChange={handleInputChange}
                placeholder="Enter supporting libraries (if any)"
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/projects")}>
            Cancel
          </Button>
          <Button type="submit" form="create-project-form" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Project"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
