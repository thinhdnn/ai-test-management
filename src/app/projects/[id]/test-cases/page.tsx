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
import { TestCasesList } from "@/components/project/test-cases-list";

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
  
  // Sử dụng client component để xử lý kiểm tra quyền
  return <TestCasesList projectId={projectId} projectName={project.name} testCases={testCases} />;
}
