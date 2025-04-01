import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai-provider";
import { getCurrentUserId, AuditFields } from "@/lib/auth-utils";
import { createNewVersion } from "@/lib/version-utils";

export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; testCaseId: string; stepId: string }> }
) {
  try {
    const resolvedParams = await params;
    const stepId = resolvedParams.stepId;

    const testStep = await prisma.testStep.findUnique({
      where: {
        id: stepId,
      },
    });

    if (!testStep) {
      return NextResponse.json(
        { error: "Test step not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(testStep);
  } catch (error) {
    console.error("Error fetching test step:", error);
    return NextResponse.json(
      { error: "Failed to fetch test step" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; testCaseId: string; stepId: string }> }
) {
  try {
    // Await params before using
    const resolvedParams = await params;
    const { id: projectId, testCaseId, stepId } = resolvedParams;
    const body = await request.json();

    // Get current user ID
    const userId = getCurrentUserId(request);

    const { action, data, expected, disabled, playwrightCode, selector } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    // Check if step exists
    const existingStep = await prisma.testStep.findUnique({
      where: {
        id: stepId,
        testCaseId: testCaseId,
      },
    });

    if (!existingStep) {
      return NextResponse.json(
        { error: "Test step not found" },
        { status: 404 }
      );
    }

    // Initialize variables at function scope
    let enhancedAction = action;
    let enhancedExpected = expected;
    let enhancedSelector = selector;
    let finalPlaywrightCode = playwrightCode;

    // If no playwrightCode is provided or it contains TODO, generate it using AI
    if (!finalPlaywrightCode || finalPlaywrightCode.includes("TODO")) {
      try {
        const aiProvider = await getAIProvider();

        try {
          const generatedStep = await aiProvider.generatePlaywrightCodeFromStep(
            action,
            data,
            expected
          );

          // Handle string response (backward compatibility)
          if (typeof generatedStep === "string") {
            finalPlaywrightCode = generatedStep;
          }
          // Handle object response
          else if (generatedStep && typeof generatedStep === "object") {
            // Extract playwright code if available
            if (typeof generatedStep.playwrightCode === "string") {
              finalPlaywrightCode = generatedStep.playwrightCode;
            }

            // Only use AI action if it's meaningful
            if (
              generatedStep.action &&
              generatedStep.action !== "N/A" &&
              generatedStep.action.trim() !== ""
            ) {
              enhancedAction = generatedStep.action;
            }

            // Only use AI expected if it's not empty
            if (
              generatedStep.expected &&
              generatedStep.expected.trim() !== ""
            ) {
              enhancedExpected = generatedStep.expected;
            }

            // Save selector if available
            if (generatedStep.selector) {
              enhancedSelector = generatedStep.selector;
            }
          }
        } catch (error) {
          console.error("Error generating Playwright code:", error);
          // Continue with original values if AI enhancement fails
        }
      } catch (error) {
        console.error("Error generating Playwright code:", error);
        // Continue with empty playwrightCode if generation fails
        finalPlaywrightCode = `// TODO: Implement "${action}" step`;
      }
    }

    // Update the test step
    const updatedStep = await prisma.testStep.update({
      where: { id: stepId },
      data: {
        action: enhancedAction,
        data,
        expected: enhancedExpected,
        disabled: disabled || false,
        playwrightCode: finalPlaywrightCode || null,
        selector: enhancedSelector || null,
        // Don't update order as it requires handling the other steps as well
        ...AuditFields.forUpdate(userId),
      },
    });

    // Create a new version after updating a step
    try {
      await createNewVersion(testCaseId, userId ?? undefined);
    } catch (error) {
      console.error("Error creating version after updating step:", error);
      // Continue even if version creation fails
    }

    return NextResponse.json(updatedStep);
  } catch (error) {
    console.error("Error updating test step:", error);
    return NextResponse.json(
      { error: "Failed to update test step" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; testCaseId: string; stepId: string }> }
) {
  try {
    const resolvedParams = await params;
    const testCaseId = resolvedParams.testCaseId;
    const stepId = resolvedParams.stepId;
    const data = await request.json();

    // Get current user ID
    const userId = getCurrentUserId(request);

    // Update test step with partial data
    const updatedStep = await prisma.testStep.update({
      where: {
        id: stepId,
        testCaseId: testCaseId,
      },
      data: {
        action: data.action !== undefined ? data.action : undefined,
        data: data.data !== undefined ? data.data : undefined,
        expected: data.expected !== undefined ? data.expected : undefined,
        disabled: data.disabled !== undefined ? data.disabled : undefined,
        order: data.order !== undefined ? data.order : undefined,
        ...AuditFields.forUpdate(userId),
      },
    });

    // Create a new version after patching a step
    try {
      await createNewVersion(testCaseId, userId ?? undefined);
    } catch (error) {
      console.error("Error creating version after patching step:", error);
      // Continue even if version creation fails
    }

    return NextResponse.json(updatedStep);
  } catch (error) {
    console.error("Error updating test step:", error);
    return NextResponse.json(
      { error: "Failed to update test step" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; testCaseId: string; stepId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const testCaseId = resolvedParams.testCaseId;
    const stepId = resolvedParams.stepId;

    // Get current user ID
    const userId = getCurrentUserId(request);

    // Get test case with project info
    const testCase = await prisma.testCase.findUnique({
      where: {
        id: testCaseId,
        projectId: projectId,
      },
      include: {
        project: true,
      },
    });

    if (!testCase) {
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    // Delete the test step
    await prisma.testStep.delete({
      where: {
        id: stepId,
        testCaseId: testCaseId,
      },
    });

    // Get all remaining test steps for this test case
    const remainingSteps = await prisma.testStep.findMany({
      where: {
        testCaseId: testCaseId,
      },
      orderBy: {
        order: "asc",
      },
    });

    // Update the order of all remaining steps
    for (let i = 0; i < remainingSteps.length; i++) {
      await prisma.testStep.update({
        where: {
          id: remainingSteps[i].id,
        },
        data: {
          order: i + 1,
        },
      });
    }

    // Create a new version after deleting a step
    try {
      await createNewVersion(testCaseId, userId ?? undefined);
    } catch (error) {
      console.error("Error creating version after deleting step:", error);
      // Continue even if version creation fails
    }

    // Update Playwright test file if project has a Playwright path
    if (testCase.project.playwrightProjectPath) {
      try {
        // Import PlaywrightService
        const { PlaywrightService } = await import("@/lib/playwright-service");

        // Create a test case object with all steps (using updated steps)
        const playwrightTestCase = {
          id: testCase.id,
          name: testCase.name,
          description: testCase.description || undefined,
          testSteps: remainingSteps.map((step) => ({
            id: step.id,
            action: step.action,
            data: step.data || undefined,
            expected: step.expected || undefined,
            disabled: step.disabled,
            order: step.order,
          })),
        };

        // Generate/update Playwright test file
        await PlaywrightService.generateTestCaseFromSteps(
          testCase.project.playwrightProjectPath,
          playwrightTestCase,
          testCase.project.url
        );

        console.log(`Updated Playwright test case after deleting test step`);
      } catch (error) {
        console.error(
          "Error updating Playwright test case after deleting test step:",
          error
        );
        // Don't return error as the test step was successfully deleted from DB
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting test step:", error);
    return NextResponse.json(
      { error: "Failed to delete test step" },
      { status: 500 }
    );
  }
}
