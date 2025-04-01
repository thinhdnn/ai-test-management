import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";
import { PlaywrightService } from "@/lib/playwright-service";

/**
 * Runs Playwright tests for a specific project
 *
 * POST /api/projects/[id]/run-tests
 *
 * Request body:
 * {
 *   testCaseId?: string; // Optional, if not provided, run all tests for the project
 *   browser?: string;    // Optional, default to project's browser
 *   headless?: boolean;  // Optional, default to true
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const { testCaseId, browser, headless = true } = await request.json();

    console.log("API received browser:", browser);

    // Get current user ID from session or cookies
    const userId = getCurrentUserId(request);

    // Get project information
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project does not exist" },
        { status: 404 }
      );
    }

    if (!project.playwrightProjectPath) {
      return NextResponse.json(
        { error: "Project does not have Playwright path" },
        { status: 400 }
      );
    }

    // Update project's lastRunBy
    await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        lastRunBy: userId,
        lastRun: new Date(),
      },
    });

    // Use PlaywrightService to run tests
    const testResult = await PlaywrightService.runProjectTests({
      projectId,
      projectPath: project.playwrightProjectPath,
      testCaseId,
      browser: browser || project.browser,
      headless,
      userId: userId ?? undefined
    });

    return NextResponse.json(testResult);
  } catch (error: any) {
    console.error("Error running tests:", error);
    return NextResponse.json({ error: "Unable to run tests" }, { status: 500 });
  }
}