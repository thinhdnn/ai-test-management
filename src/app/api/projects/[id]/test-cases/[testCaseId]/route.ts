import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId, AuditFields } from "@/lib/auth-utils";
import path from "path";
import { promises as fs } from "fs";
import { toKebabCase } from "@/lib/utils";
import { TestCase, Project } from "@prisma/client";
import { TestCaseWithProject } from "@/types";
import { getAIProvider } from "@/lib/ai-provider";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const testCaseId = resolvedParams.testCaseId;

    const testCase = await prisma.testCase.findUnique({
      where: {
        id: testCaseId,
      },
      include: {
        project: true,
      },
    }) as TestCaseWithProject | null;

    if (!testCase) {
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    // Get user information if createdBy exists
    let createdByUsername = null;
    if (testCase.createdBy) {
      const user = await prisma.user.findUnique({
        where: { id: testCase.createdBy },
        select: { username: true },
      });

      if (user) {
        createdByUsername = user.username;
      }
    }

    // Get updated by username if exists
    let updatedByUsername = null;
    if (testCase.updatedBy) {
      const user = await prisma.user.findUnique({
        where: { id: testCase.updatedBy },
        select: { username: true },
      });

      if (user) {
        updatedByUsername = user.username;
      }
    }

    // Get last run by username if exists
    let lastRunByUsername = null;
    if (testCase.lastRunBy) {
      const user = await prisma.user.findUnique({
        where: { id: testCase.lastRunBy },
        select: { username: true },
      });

      if (user) {
        lastRunByUsername = user.username;
      }
    }

    // Parse tags if they are stored as a JSON string
    let parsedTags: string[] = [];
    if (testCase.tags) {
      try {
        const parsed = JSON.parse(testCase.tags);
        parsedTags = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        console.error("Error parsing tags:", e);
      }
    }

    // Return the test case with parsed tags and username
    return NextResponse.json({
      ...testCase,
      createdByUsername,
      updatedByUsername,
      lastRunByUsername,
      tags: parsedTags,
    });
  } catch (error) {
    console.error("Error fetching test case:", error);
    return NextResponse.json(
      { error: "Failed to fetch test case" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const testCaseId = resolvedParams.testCaseId;
    const data = await request.json();
    const userId = getCurrentUserId(request);

    // Get current test case with project information
    const currentTestCase = await prisma.testCase.findUnique({
      where: {
        id: testCaseId,
        projectId: projectId,
      },
      include: {
        project: true,
      },
    }) as TestCaseWithProject | null;

    if (!currentTestCase) {
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    // Fix test case name if it's being updated
    if (data.name && data.name !== currentTestCase.name) {
      const aiProvider = await getAIProvider();
      data.name = await aiProvider.fixTestCaseName(data.name);
    }

    // Process tags to ensure proper format
    let tagData = data.tags;
    if (tagData) {
      if (Array.isArray(tagData)) {
        tagData = JSON.stringify(tagData);
      } else if (typeof tagData === "string") {
        try {
          // Try to parse if it's a JSON string
          if (tagData.startsWith("[") || tagData.startsWith("{")) {
            const parsedTags = JSON.parse(tagData);
            tagData = JSON.stringify(Array.isArray(parsedTags) ? parsedTags : [parsedTags]);
          } else {
            tagData = JSON.stringify([tagData]);
          }
        } catch (e) {
          tagData = JSON.stringify([tagData]);
        }
      } else {
        tagData = JSON.stringify([String(tagData)]);
      }
    }

    // If name changed and test file exists, rename the file
    if (data.name !== currentTestCase.name && currentTestCase.testFilePath && currentTestCase.project.playwrightProjectPath) {
      try {
        const oldPath = path.join(currentTestCase.project.playwrightProjectPath, currentTestCase.testFilePath);
        const newFileName = `${toKebabCase(data.name)}.spec.ts`;
        const newPath = path.join(path.dirname(oldPath), newFileName);
        
        // Rename the file
        await fs.rename(oldPath, newPath);
        data.testFilePath = path.relative(currentTestCase.project.playwrightProjectPath, newPath);
      } catch (error) {
        console.error("Error renaming test file:", error);
        // Continue with update even if file rename fails
      }
    }

    const testCase = await prisma.testCase.update({
      where: {
        id: testCaseId,
        projectId: projectId,
      },
      data: {
        name: data.name,
        description: data.description || "",
        status: data.status,
        tags: tagData,
        testFilePath: data.testFilePath,
        ...AuditFields.forUpdate(userId),
      },
    });

    // Parse tags for response
    let parsedTags: string[] = [];
    if (testCase.tags) {
      try {
        parsedTags = JSON.parse(testCase.tags);
        if (!Array.isArray(parsedTags)) {
          parsedTags = [parsedTags];
        }
      } catch (e) {
        parsedTags = [testCase.tags];
      }
    }

    return NextResponse.json({
      id: testCase.id,
      projectId: testCase.projectId,
      name: testCase.name,
      description: testCase.description || "",
      status: testCase.status,
      createdAt: testCase.createdAt,
      lastRun: testCase.lastRun,
      tags: parsedTags,
    });
  } catch (error) {
    console.error("Error updating test case:", error);
    return NextResponse.json(
      { error: "Failed to update test case" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const testCaseId = resolvedParams.testCaseId;

    // Check if the test case exists
    const testCase = await prisma.testCase.findUnique({
      where: {
        id: testCaseId,
        projectId: projectId,
      },
      include: {
        testSteps: true,
        project: true,
      },
    });

    if (!testCase) {
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    // Delete test file if it exists
    if (testCase.testFilePath && testCase.project.playwrightProjectPath) {
      try {
        const filePath = path.join(testCase.project.playwrightProjectPath, testCase.testFilePath);
        await fs.unlink(filePath);
      } catch (error) {
        console.error("Error deleting test file:", error);
        // Continue with test case deletion even if file deletion fails
      }
    }

    // Delete test case (cascade delete will also delete test steps)
    await prisma.testCase.delete({
      where: {
        id: testCaseId,
        projectId: projectId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting test case:", error);
    return NextResponse.json(
      { error: "Failed to delete test case" },
      { status: 500 }
    );
  }
}
