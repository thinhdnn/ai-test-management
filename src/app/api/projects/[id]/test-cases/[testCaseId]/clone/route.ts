import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const { id: projectId, testCaseId } = await params;

    // 1. Get information about the current test case
    const existingTestCase = await prisma.testCase.findUnique({
      where: {
        id: testCaseId,
      },
      include: {
        testSteps: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!existingTestCase) {
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    // 2. Create a new test case with information from the old test case
    const newTestCase = await prisma.testCase.create({
      data: {
        id: uuidv4(),
        name: `${existingTestCase.name} (Clone)`,
        description: existingTestCase.description,
        status: "pending", // Set status to pending for the clone
        projectId: projectId,
        tags: existingTestCase.tags,
        playwrightCodeSource: existingTestCase.playwrightCodeSource,
        version: existingTestCase.version,
      },
    });

    // 3. Clone all test steps from the old test case to the new test case
    if (existingTestCase.testSteps && existingTestCase.testSteps.length > 0) {
      const stepsToCreate = existingTestCase.testSteps.map((step) => ({
        id: uuidv4(),
        order: step.order,
        action: step.action,
        data: step.data,
        expected: step.expected,
        playwrightCode: step.playwrightCode,
        disabled: step.disabled,
        selector: step.selector,
        fixtureId: (step as any).fixtureId,
        testCaseId: newTestCase.id,
      }));

      await prisma.testStep.createMany({
        data: stepsToCreate,
      });
    }

    // 4. Create Playwright file for the new test case
    try {
      // Instead of using update-playwright, use consolidate-steps which handles empty steps better
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const consolidateStepsUrl = `${baseUrl}/api/projects/${projectId}/test-cases/${newTestCase.id}/consolidate-steps`;

      const consolidateResponse = await fetch(consolidateStepsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cleanupAndRebuild: true,
          preserveImports: true
        }),
      });

      if (!consolidateResponse.ok) {
        const errorText = await consolidateResponse.text();
        console.error("Failed to consolidate steps for cloned test case:", errorText);
      } else {
        console.log("Successfully consolidated steps for cloned test case");
      }
    } catch (error) {
      console.error("Error creating Playwright file for cloned test case:", error);
      // Don't fail hard if Playwright file creation fails
    }

    return NextResponse.json(newTestCase);
  } catch (error) {
    console.error("Error cloning test case:", error);
    return NextResponse.json(
      { error: "Failed to clone test case" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
