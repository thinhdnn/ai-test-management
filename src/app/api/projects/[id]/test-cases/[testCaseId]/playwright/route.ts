import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";
import { toValidFileName } from "@/lib/utils";

// GET: Get Playwright test file content
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const testCaseId = resolvedParams.testCaseId;

    // Get test case and project information
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
        { error: "Test case does not exist" },
        { status: 404 }
      );
    }

    if (!testCase.project.playwrightProjectPath) {
      return NextResponse.json(
        { error: "Project does not have Playwright path" },
        { status: 400 }
      );
    }

    // Build path to test file
    const testFileName = `${toValidFileName(testCase.name)}.spec.ts`;
    const testFilePath = path.join(
      testCase.project.playwrightProjectPath,
      "tests",
      testFileName
    );

    let content = "";

    // Check if file exists on disk
    if (fs.existsSync(testFilePath)) {
      // Read file content from disk
      content = fs.readFileSync(testFilePath, "utf-8");
    } else if (testCase.playwrightCodeSource) {
      // Use the code from database if file doesn't exist
      content = testCase.playwrightCodeSource;

      // Create the test file on disk
      const testsDir = path.join(
        testCase.project.playwrightProjectPath,
        "tests"
      );
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
      }

      // Write the content to file
      fs.writeFileSync(testFilePath, content, "utf-8");
    } else {
      // Create a basic Playwright template if nothing exists
      content = `import { test, expect } from '@playwright/test';

test('${testCase.name}', async ({ page }) => {
  // Navigate to the application
  await page.goto('${testCase.project.url}');
  
  // TODO: Add test steps here
});`;

      // Save this template to both database and file
      await prisma.testCase.update({
        where: { id: testCaseId },
        data: { playwrightCodeSource: content },
      });

      // Create the test file on disk
      const testsDir = path.join(
        testCase.project.playwrightProjectPath,
        "tests"
      );
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
      }

      // Write the content to file
      fs.writeFileSync(testFilePath, content, "utf-8");
    }

    return NextResponse.json({
      filePath: testFilePath,
      content,
    });
  } catch (error) {
    console.error("Error reading Playwright test file:", error);
    return NextResponse.json(
      { error: "Cannot read Playwright test file" },
      { status: 500 }
    );
  }
}

// PUT: Update Playwright test file content
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const testCaseId = resolvedParams.testCaseId;
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content cannot be empty" },
        { status: 400 }
      );
    }

    // Get test case and project information
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
        { error: "Test case does not exist" },
        { status: 404 }
      );
    }

    if (!testCase.project.playwrightProjectPath) {
      return NextResponse.json(
        { error: "Project does not have Playwright path" },
        { status: 400 }
      );
    }

    // Build path to test file
    const testFileName = `${toValidFileName(testCase.name)}.spec.ts`;
    const testFilePath = path.join(
      testCase.project.playwrightProjectPath,
      "tests",
      testFileName
    );

    // Ensure test directory exists
    const testsDir = path.join(testCase.project.playwrightProjectPath, "tests");
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }

    // Write new content to file
    fs.writeFileSync(testFilePath, content, "utf-8");

    // Also update the content in the database
    await prisma.testCase.update({
      where: { id: testCaseId },
      data: { playwrightCodeSource: content },
    });

    return NextResponse.json({
      success: true,
      message: "Updated Playwright test file successfully",
    });
  } catch (error) {
    console.error("Error updating Playwright test file:", error);
    return NextResponse.json(
      { error: "Cannot update Playwright test file" },
      { status: 500 }
    );
  }
}
