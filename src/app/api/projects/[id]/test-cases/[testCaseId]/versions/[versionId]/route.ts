import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/projects/[id]/test-cases/[testCaseId]/versions/[versionId]
 * Get a specific version with its steps
 */
export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; testCaseId: string; versionId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const testCaseId = resolvedParams.testCaseId;
    const versionId = resolvedParams.versionId;

    // Verify test case exists and belongs to the project
    const testCase = await prisma.testCase.findUnique({
      where: {
        id: testCaseId,
        projectId: projectId,
      },
    });

    if (!testCase) {
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    // Get the specific version
    const version = await prisma.testCaseVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.testCaseId !== testCaseId) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Get the steps for this version
    const steps = await prisma.testStepVersion.findMany({
      where: { testCaseVersionId: versionId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({
      version,
      steps,
    });
  } catch (error) {
    console.error("Error fetching version details:", error);
    return NextResponse.json(
      { error: "Failed to fetch version details" },
      { status: 500 }
    );
  }
}
