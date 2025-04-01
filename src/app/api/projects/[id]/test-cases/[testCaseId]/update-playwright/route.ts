import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";
import { toValidFileName } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const { id: projectId, testCaseId } = await params;
    const body = await request.json();
    const { step, action } = body; // action: 'add', 'update', 'delete', or 'toggle'

    console.log(
      `[Update Playwright] Action: ${action}, TestCase: ${testCaseId}, Project: ${projectId}`
    );

    // Get test case with all steps
    const testCase = await prisma.testCase.findUnique({
      where: {
        id: testCaseId,
        projectId: projectId,
      },
      include: {
        project: true,
        testSteps: {
          where: { disabled: false },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!testCase) {
      console.error(`[Update Playwright] Test case not found: ${testCaseId}`);
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    // Ensure project has a valid path
    if (!testCase.project.playwrightProjectPath) {
      console.error(
        `[Update Playwright] Project does not have a Playwright project path: ${projectId}`
      );
      return NextResponse.json(
        { error: "Project does not have a Playwright project path" },
        { status: 400 }
      );
    }

    // Generate Playwright code from all test steps
    console.log(
      `[Update Playwright] Generating code from ${testCase.testSteps.length} active steps`
    );
    const playwrightCode = generatePlaywrightScriptFromSteps(testCase);

    // Update the test case with the updated code
    await prisma.testCase.update({
      where: {
        id: testCaseId,
      },
      data: {
        playwrightCodeSource: playwrightCode,
      },
    });

    // Write content to Playwright test file
    const testFileName = `${toValidFileName(testCase.name)}.spec.ts`;
    const testsDir = path.join(testCase.project.playwrightProjectPath, "tests");
    const testFilePath = path.join(testsDir, testFileName);

    console.log(`[Update Playwright] Writing file to: ${testFilePath}`);

    // Ensure tests directory exists
    try {
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
        console.log(`[Update Playwright] Created tests directory: ${testsDir}`);
      }

      // Write file
      fs.writeFileSync(testFilePath, playwrightCode, "utf-8");
      console.log(
        `[Update Playwright] File successfully written: ${testFilePath}`
      );
    } catch (fsError) {
      console.error(`[Update Playwright] File system error:`, fsError);
      return NextResponse.json(
        {
          error: "Failed to write Playwright test file",
          details: fsError instanceof Error ? fsError.message : String(fsError),
          path: testFilePath,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Playwright test file updated successfully",
      filePath: testFilePath,
    });
  } catch (error) {
    console.error(
      "[Update Playwright] Error updating Playwright test file:",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to update Playwright test file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Function to generate a complete Playwright test script from all test steps
function generatePlaywrightScriptFromSteps(testCase: any): string {
  const { name, testSteps, project } = testCase;

  // Get the URL from the project
  const url = project?.url || "https://example.com";

  // Create a sanitized test name for comments
  const testName = name;

  let script = `import { test, expect } from '@playwright/test';\n\n`;
  script += `test('${name.replace(/'/g, "\\'")}', async ({ page }) => {\n`;

  // Add default navigation if the first step is not a navigation step
  let hasNavigation = false;

  if (testSteps.length > 0) {
    // Check if any step is a navigation step
    hasNavigation = testSteps.some(
      (step: any) =>
        (step.playwrightCode && step.playwrightCode.includes("goto")) ||
        (step.action && step.action.toLowerCase().includes("navigate"))
    );
  }

  if (!hasNavigation) {
    script += `  // Navigate to the application\n`;
    script += `  await page.goto('${url}');\n\n`;
  }

  // Add each test step
  const activeTestSteps = testSteps.filter((step: any) => !step.disabled);

  activeTestSteps.forEach((step: any, index: number) => {
    // Skip disabled steps
    if (step.disabled) {
      return;
    }

    // Add comment with step number and action
    script += `  // Step ${index + 1}: ${
      step.action || "Action not specified"
    }${step.expected ? ` - Expect: ${step.expected}` : ""}\n`;

    // If step has playwrightCode, use it
    if (step.playwrightCode) {
      // Add the step code with proper indentation
      // Ensure code lines have proper indentation
      const playwrightCode = step.playwrightCode
        .split("\n")
        .map((line: string) => {
          const trimmedLine = line.trim();
          return trimmedLine ? `  ${trimmedLine}` : line;
        })
        .join("\n");

      script += `${playwrightCode}\n`;

      // Add assertion if there's an expected result and it's not already in the playwrightCode
      if (
        step.expected &&
        step.selector &&
        !step.playwrightCode.includes("expect") &&
        !step.playwrightCode.includes(step.expected)
      ) {
        script += `  // Assertion based on expected result\n`;
        script += `  await expect(page.locator('${
          step.selector
        }')).toContainText('${step.expected.replace(/'/g, "\\'")}');\n`;
      }
    }
    // If no playwrightCode, generate basic code based on step data
    else {
      try {
        let generatedCode = "";

        if (step.action?.toLowerCase().includes("navigate")) {
          generatedCode = `  await page.goto('${step.data || url}');\n`;
        } else if (step.action?.toLowerCase().includes("click")) {
          if (step.selector) {
            generatedCode = `  await page.locator('${step.selector}').click();\n`;
          } else {
            generatedCode = `  // TODO: Click operation - missing selector\n`;
          }
        } else if (
          step.action?.toLowerCase().includes("fill") ||
          step.action?.toLowerCase().includes("type")
        ) {
          if (step.selector && step.data) {
            generatedCode = `  await page.locator('${
              step.selector
            }').fill('${step.data.replace(/'/g, "\\'")}');\n`;
          } else {
            generatedCode = `  // TODO: Fill operation - missing selector or data\n`;
          }
        } else if (step.action?.toLowerCase().includes("select")) {
          if (step.selector && step.data) {
            generatedCode = `  await page.locator('${
              step.selector
            }').selectOption('${step.data.replace(/'/g, "\\'")}');\n`;
          } else {
            generatedCode = `  // TODO: Select operation - missing selector or data\n`;
          }
        } else if (
          step.action?.toLowerCase().includes("check") ||
          step.action?.toLowerCase().includes("uncheck")
        ) {
          const checkAction = step.action?.toLowerCase().includes("uncheck")
            ? "uncheck"
            : "check";
          if (step.selector) {
            generatedCode = `  await page.locator('${step.selector}').${checkAction}();\n`;
          } else {
            generatedCode = `  // TODO: ${checkAction} operation - missing selector\n`;
          }
        } else {
          generatedCode = `  // TODO: Implementation needed for "${step.action}"\n`;
        }

        script += generatedCode;

        // Add assertion if there's an expected result
        if (step.expected && step.selector) {
          script += `  // Assertion based on expected result\n`;
          script += `  await expect(page.locator('${
            step.selector
          }')).toContainText('${step.expected.replace(/'/g, "\\'")}');\n`;
        }
      } catch (err) {
        script += `  // Error generating code for this step: ${
          err instanceof Error ? err.message : String(err)
        }\n`;
        script += `  // TODO: Implementation needed for "${step.action}"\n`;
      }
    }

    script += "\n";
  });

  script += "});\n";

  return script;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const { id: projectId, testCaseId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Get test case
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

    // Ensure project has a valid path
    if (!testCase.project.playwrightProjectPath) {
      return NextResponse.json(
        { error: "Project does not have a Playwright project path" },
        { status: 400 }
      );
    }

    // Update the test case with the updated code source
    await prisma.testCase.update({
      where: {
        id: testCaseId,
      },
      data: {
        playwrightCodeSource: content,
      },
    });

    // Write content to Playwright test file
    const testFileName = `${toValidFileName(testCase.name)}.spec.ts`;
    const testsDir = path.join(testCase.project.playwrightProjectPath, "tests");
    const testFilePath = path.join(testsDir, testFileName);

    // Ensure tests directory exists
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(testFilePath, content, "utf-8");

    return NextResponse.json({
      success: true,
      message: "Playwright test file updated successfully",
      filePath: testFilePath,
    });
  } catch (error) {
    console.error("Error updating Playwright test file:", error);
    return NextResponse.json(
      {
        error: "Failed to update Playwright test file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
