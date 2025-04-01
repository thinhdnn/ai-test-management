"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProjectDeleteButton } from "@/components/project-delete-button";
import { RunAllTestsButton } from "@/components/run-all-tests-button";
import { useState, useEffect } from "react";

// Tạo kiểu dữ liệu cho project
interface Project {
  id: string;
  name: string;
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const pathname = usePathname();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Project not found");
          } else {
            setError("Failed to load project");
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
        // Delay to prevent flash
        setTimeout(() => {
          setLoading(false);
        }, 100);
      }
    };

    fetchProject();
    
    // Add global event to allow child components to trigger a project data refresh
    const handleRefreshProject = () => {
      fetchProject();
    };
    document.addEventListener("refreshProject", handleRefreshProject);
    
    return () => {
      document.removeEventListener("refreshProject", handleRefreshProject);
    };
  }, [projectId]);

  // Xác định tab nào đang active dựa trên đường dẫn
  const getTabActive = () => {
    if (pathname === `/projects/${projectId}`) return "test-cases";
    if (pathname.includes("/history")) return "test-history";
    if (pathname.includes("/fixtures")) return "fixtures";
    if (pathname.includes("/settings")) return "settings";
    return "test-cases";
  };

  const activeTab = getTabActive();

  // If loading, show the loading state for the entire layout
  if (loading) {
    return (
      <div className="container px-4 py-6 sm:px-6 md:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Loading project...</h1>
        </div>
        <div className="mt-8 border-b border-border">
          <nav className="flex -mb-px">
            {/* Placeholder navigation */}
          </nav>
        </div>
        <div className="mt-6 flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading project data...</p>
        </div>
      </div>
    );
  }

  // If there's an error, show error state
  if (error) {
    return (
      <div className="container px-4 py-6 sm:px-6 md:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-red-500">Error</h1>
        </div>
        <div className="mt-6 flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-red-500">{error}</p>
          <Button asChild variant="outline">
            <Link href="/projects">Back to Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 sm:px-6 md:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {project?.name || "Project"}
        </h1>
        <div className="flex gap-2">
          <RunAllTestsButton projectId={projectId} />
          <Button asChild size="sm">
            <Link href={`/projects/${projectId}/test-cases/new`}>
              Add Test Case
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/projects/${projectId}/fixtures/new`}>
              Add Fixture
            </Link>
          </Button>
          {project && (
            <ProjectDeleteButton
              projectId={projectId}
              projectName={project.name}
              redirectToProjects={true}
            />
          )}
        </div>
      </div>

      <div className="mt-8 border-b border-border">
        <nav className="flex -mb-px">
          <Link
            href={`/projects/${projectId}`}
            className={`mr-4 py-2 px-1 text-sm font-medium ${
              activeTab === "test-cases"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted"
            }`}
          >
            Test Case Worklist
          </Link>
          <Link
            href={`/projects/${projectId}/history`}
            className={`mr-4 py-2 px-1 text-sm font-medium ${
              activeTab === "test-history"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted"
            }`}
          >
            Test History
          </Link>
          <Link
            href={`/projects/${projectId}/fixtures`}
            className={`mr-4 py-2 px-1 text-sm font-medium ${
              activeTab === "fixtures"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted"
            }`}
          >
            Fixtures
          </Link>
          <Link
            href={`/projects/${projectId}/settings`}
            className={`mr-4 py-2 px-1 text-sm font-medium ${
              activeTab === "settings"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted"
            }`}
          >
            Project Settings
          </Link>
        </nav>
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
} 