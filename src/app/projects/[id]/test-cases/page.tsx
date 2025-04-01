import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, FileCode, Eye } from "lucide-react";
import { TestCaseDeleteButton } from "@/components/test-case-delete-button";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { RunTestButton } from "@/components/run-test-button";


// Function to get project information
async function getProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  return project;
}

// Function to get test cases list for a project
async function getTestCases(projectId: string) {
  const testCases = await prisma.testCase.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return testCases;
}

export default async function TestCasesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;

  // Get data from server
  const project = await getProject(projectId);
  const testCases = await getTestCases(projectId);

  if (!project) {
    return (
      <div className="container px-4 py-6 sm:px-6 md:px-8">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-red-500">Project does not exist</p>
          <Button asChild variant="outline">
            <Link href="/projects">Back to Projects list</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 sm:px-6 md:px-8">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Test Cases</h1>
          <p className="text-muted-foreground">
            Manage test cases for project {project.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="h-9">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Link>
          </Button>
          <Button variant="default" size="sm" asChild className="h-9">
            <Link href={`/projects/${projectId}/test-cases/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Test Case
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-none">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-medium">Test Cases List</CardTitle>
        </CardHeader>
        <CardContent>
          {testCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No test cases yet. Create a new test case to get started.
              </p>
              <Button asChild size="sm">
                <Link href={`/projects/${projectId}/test-cases/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Test Case
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCases.map((testCase) => (
                    <TableRow key={testCase.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/projects/${projectId}/test-cases/${testCase.id}`}
                          className="hover:underline"
                        >
                          {testCase.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="text-xs font-normal px-2 py-0.5 rounded-md capitalize"
                          variant={
                            testCase.status === "passed"
                              ? "secondary"
                              : testCase.status === "failed"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {testCase.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {testCase.tags && typeof testCase.tags === "string" ? (
                          <div className="flex flex-wrap gap-1">
                            {JSON.parse(testCase.tags as string).map(
                              (tag: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs font-normal px-2 py-0.5 rounded-md"
                                >
                                  {tag}
                                </Badge>
                              )
                            )}
                          </div>
                        ) : testCase.tags && Array.isArray(testCase.tags) ? (
                          <div className="flex flex-wrap gap-1">
                            {(testCase.tags as string[]).map(
                              (tag: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs font-normal px-2 py-0.5 rounded-md"
                                >
                                  {tag}
                                </Badge>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm"></span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(testCase.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {testCase.lastRun
                          ? formatDate(testCase.lastRun)
                          : "Not run yet"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-8 w-8"
                            title="View Playwright Test"
                          >
                            <Link
                              href={`/projects/${projectId}/test-cases/${testCase.id}/playwright`}
                            >
                              <FileCode className="h-4 w-4" />
                            </Link>
                          </Button>
                          <RunTestButton
                            projectId={projectId}
                            testCaseId={testCase.id}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Run Test"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-8 w-8"
                            title="View Details"
                          >
                            <Link
                              href={`/projects/${projectId}/test-cases/${testCase.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <TestCaseDeleteButton
                            projectId={projectId}
                            testCaseId={testCase.id}
                            testCaseName={testCase.name}
                            redirectToProject={false}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
