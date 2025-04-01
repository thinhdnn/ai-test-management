"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { TestHistory } from "@/components/project/test-history";

interface Project {
  id: string;
  name: string;
}

export default function ProjectHistoryPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [loading, setLoading] = useState(true);
  const [projectLoading, setProjectLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setProjectLoading(true);
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Project not found");
          } else {
            setError("Failed to load project data");
          }
          return;
        }
        const data = await response.json();
        setProject(data);
        setError(null);
      } catch (error) {
        console.error("Error fetching project:", error);
        setError("An error occurred while loading the project");
      } finally {
        setProjectLoading(false);
      }
    };

    const fetchHistoryData = async () => {
      // Additional data fetching if needed
      // This is where you'd load history-specific data
    };

    Promise.all([fetchProject(), fetchHistoryData()])
      .finally(() => {
        setLoading(false);
      });
  }, [projectId]);

  if (loading || projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading test history...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error || "Project not found"}</p>
      </div>
    );
  }

  return <TestHistory projectId={projectId} />;
} 