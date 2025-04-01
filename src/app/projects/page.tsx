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
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { ProjectDeleteButton } from "@/components/project-delete-button";

// Fetch projects from database
async function getProjects() {
  // Use server-side data fetching with Prisma
  const projects = await prisma.project.findMany({
    include: {
      _count: {
        select: { testCases: true },
      },
      testCases: {
        select: {
          status: true,
        },
      },
    },
  });

  // Transform data to match the structure used in the frontend
  return projects.map((project) => {
    const passed = project.testCases.filter(
      (tc) => tc.status === "passed"
    ).length;
    const failed = project.testCases.filter(
      (tc) => tc.status === "failed"
    ).length;
    const pending = project.testCases.filter(
      (tc) => tc.status === "pending"
    ).length;

    return {
      id: project.id,
      name: project.name,
      description: project.description || "",
      url: project.url,
      browser: project.browser,
      environment: project.environment,
      createdAt: project.createdAt,
      testCases: {
        total: project._count.testCases,
        passed,
        failed,
        pending,
      },
    };
  });
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="container px-4 py-6 sm:px-6 md:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        {projects.length > 0 && (
          <Button asChild>
            <Link href="/projects/new">Create New Project</Link>
          </Button>
        )}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <path d="M12 2v20M2 12h20" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first project to start managing your test cases
            </p>
            <Button asChild size="lg">
              <Link href="/projects/new">Add first your project</Link>
            </Button>
          </div>
        ) : (
          projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">URL:</span>
                    <span className="font-medium">{project.url}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Browser:</span>
                    <span className="font-medium">{project.browser}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Environment:</span>
                    <span className="font-medium">{project.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created Date:</span>
                    <span className="font-medium">
                      {formatDate(project.createdAt)}
                    </span>
                  </div>
                  <div className="mt-4 flex justify-between">
                    <span className="text-muted-foreground">Test cases:</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                      <span className="text-xs">
                        {project.testCases.passed}
                      </span>
                      <span className="inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                      <span className="text-xs">
                        {project.testCases.failed}
                      </span>
                      <span className="inline-flex h-2 w-2 rounded-full bg-yellow-500"></span>
                      <span className="text-xs">
                        {project.testCases.pending}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/projects/${project.id}`}>Details</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/projects/${project.id}/test-cases`}>
                      Test Cases
                    </Link>
                  </Button>
                </div>
                <ProjectDeleteButton
                  projectId={project.id}
                  projectName={project.name}
                />
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
