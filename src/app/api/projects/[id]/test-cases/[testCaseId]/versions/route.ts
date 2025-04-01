import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-utils";
import { getTestCaseVersions, restoreVersion } from "@/lib/version-utils";

/**
 * GET /api/projects/[id]/test-cases/[testCaseId]/versions
 * Get all versions for a test case
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const testCaseId = resolvedParams.testCaseId;

    console.log("Fetching versions for test case:", testCaseId);

    // Verify test case exists and belongs to the project
    const testCase = await prisma.testCase.findUnique({
      where: {
        id: testCaseId,
        projectId: projectId,
      },
    });

    if (!testCase) {
      console.error("Test case not found:", testCaseId);
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    // Get all versions for the test case
    const versions = await getTestCaseVersions(testCaseId);
    console.log("Found versions:", versions.length);

    return NextResponse.json(versions);
  } catch (error) {
    console.error("Error fetching test case versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch test case versions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/test-cases/[testCaseId]/versions/restore
 * Restore a test case to a specific version
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const testCaseId = resolvedParams.testCaseId;
    const { versionId } = await request.json();

    if (!versionId) {
      return NextResponse.json(
        { error: "Version ID is required" },
        { status: 400 }
      );
    }

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

    // Get current user ID
    const userId = getCurrentUserId(request);

    // Restore the test case to the specified version
    await restoreVersion(testCaseId, versionId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error restoring test case version:", error);
    return NextResponse.json(
      { error: "Failed to restore test case version" },
      { status: 500 }
    );
  }
}
