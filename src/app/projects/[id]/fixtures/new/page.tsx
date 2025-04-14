"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { usePermission } from "@/lib/hooks/usePermission";

export default function NewFixturePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();
  const { hasPermission } = usePermission();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fixture, setFixture] = useState({
    name: "",
    description: "",
    type: "setup"
  });

  // Kiểm tra quyền khi trang được tải
  useEffect(() => {
    if (!hasPermission("testcase.create")) {
      toast.error("You don't have permission to create fixtures");
      router.push(`/projects/${projectId}/fixtures`);
    }
  }, [hasPermission, projectId, router]);

  const handleCreateFixture = async () => {
    if (!hasPermission("testcase.create")) {
      toast.error("You don't have permission to create fixtures");
      return;
    }

    if (!fixture.name.trim()) {
      toast.error("Fixture name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/projects/${projectId}/fixtures`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fixture),
      });

      if (!response.ok) {
        throw new Error("Failed to create fixture");
      }

      toast.success("Fixture created successfully");
      
      // Navigate back to the fixtures page
      router.push(`/projects/${projectId}/fixtures`);
    } catch (error) {
      console.error("Error creating fixture:", error);
      toast.error("Failed to create fixture");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isSubmitting && fixture.name.trim()) {
          handleCreateFixture();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, fixture.name]);

  return (
    <div className="max-w-2xl mx-auto py-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Fixture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Fixture Name</Label>
            <Input
              id="name"
              value={fixture.name}
              onChange={(e) => setFixture({ ...fixture, name: e.target.value })}
              placeholder="Enter fixture name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Fixture Type</Label>
            <Select
              value={fixture.type}
              onValueChange={(value) => setFixture({ ...fixture, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select fixture type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="setup">Setup</SelectItem>
                <SelectItem value="teardown">Teardown</SelectItem>
                <SelectItem value="data">Test Data</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={fixture.description}
              onChange={(e) => setFixture({ ...fixture, description: e.target.value })}
              placeholder="Describe what this fixture does"
              rows={4}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            onClick={handleCreateFixture}
            disabled={isSubmitting || !fixture.name.trim()}
          >
            {isSubmitting ? "Creating..." : "Create Fixture"}
          </Button>
          <div className="text-xs text-muted-foreground self-center">
            Press <kbd className="px-1 py-0.5 text-xs border rounded-md">Ctrl+Enter</kbd> to submit
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 