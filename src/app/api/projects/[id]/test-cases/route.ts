import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verify } from "jsonwebtoken";
import { getCurrentUserId, AuditFields } from "@/lib/auth-utils";
import path from "path";
import fs from "fs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    const testCases = await prisma.testCase.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { testSteps: true },
        },
      },
      orderBy: { order: "asc" },
    });

    // Transform data to match the structure used in the frontend
    const transformedTestCases = testCases.map((testCase, index) => {
      // Parse tags from JSON string
      const tags = testCase.tags ? JSON.parse(testCase.tags) : [];

      return {
        id: testCase.id,
        name: testCase.name,
        description: testCase.description,
        status: testCase.status,
        createdAt: testCase.createdAt,
        lastRun: testCase.lastRun,
        tags,
        steps: testCase._count.testSteps,
        isManual: testCase.isManual || false,
        // Temporarily use index + 1 as order until database schema is updated
        order: index + 1,
      };
    });

    return NextResponse.json(transformedTestCases);
  } catch (error) {
    console.error("Error fetching test cases:", error);
    return NextResponse.json(
      { error: "Failed to fetch test cases" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const body = await request.json();

    // Get current user ID
    const userId = getCurrentUserId(request);

    // Convert tags array to JSON string for storage
    const tagsJson = JSON.stringify(body.tags || []);

    // Find project information
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    // Find the highest current order value to place the new test case at the end
    const maxOrderTestCase = await prisma.testCase.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' },
    });
    
    // Calculate next order value (max + 1, or 1 if no test cases exist)
    const nextOrder = maxOrderTestCase?.order ? maxOrderTestCase.order + 1 : 1;
    
    // Verify project path exists
    if (project.playwrightProjectPath && !body.isManual) {
      if (!fs.existsSync(project.playwrightProjectPath)) {
        console.error(`Project path does not exist: ${project.playwrightProjectPath}`);
        return NextResponse.json(
          { error: "Project path does not exist" }, 
          { status: 400 }
        );
      }
    }

    // Create new test case
    const newTestCase = await prisma.testCase.create({
      data: {
        name: body.name,
        description: body.description || "",
        status: body.status || "pending",
        tags: tagsJson,
        isManual: body.isManual || false,
        order: nextOrder, // Set to the calculated next order value
        projectId: projectId,
        ...AuditFields.forCreate(userId),
      },
    });

    console.log(`Created new test case in database: ${newTestCase.id}`);

    // If project has Playwright path and test case is not manual, create new test case file
    if (project.playwrightProjectPath && !body.isManual) {
      try {
        // Import PlaywrightService
        const { PlaywrightService } = await import("@/lib/playwright-service");

        // Create empty test case with basic properties
        const playwrightTestCase = {
          id: newTestCase.id,
          name: newTestCase.name,
          description: newTestCase.description || undefined,
          testSteps: [], // Start with empty step list
          tags: body.tags || [], // Add tags here
        };

        console.log(`Generating Playwright test case file for test case: ${newTestCase.id}`);
        console.log(`Project path: ${project.playwrightProjectPath}`);
        console.log(`Base URL: ${project.url}`);

        // Ensure the tests directory exists
        const testsDir = path.join(project.playwrightProjectPath, 'tests');
        if (!fs.existsSync(testsDir)) {
          fs.mkdirSync(testsDir, { recursive: true });
          console.log(`Created tests directory: ${testsDir}`);
        }

        // Create Playwright test case file synchronously to ensure it's created
        const testFilePath = await PlaywrightService.generateTestCaseFromSteps(
          project.playwrightProjectPath,
          playwrightTestCase,
          project.url || 'http://localhost'
        );

        console.log(`Successfully created Playwright test file at: ${testFilePath}`);

        const relativePath = path.relative(project.playwrightProjectPath, testFilePath);
        
        // Update test case with the file path
        await prisma.testCase.update({
          where: { id: newTestCase.id },
          data: { 
            testFilePath: relativePath,
          },
        });
      } catch (error) {
        console.error("Error creating Playwright test case:", error);
        // Don't return error as the test case was successfully created in DB
        // But log detailed information for debugging
        console.error(`Failed to create test file for test case ${newTestCase.id} in project ${projectId}`);
        console.error(`Project path: ${project.playwrightProjectPath}`);
        console.error(`Error details:`, error);
      }
    }

    return NextResponse.json(
      {
        success: true,
        testCase: {
          ...newTestCase,
          tags: body.tags || [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating test case:", error);
    return NextResponse.json(
      { error: "Failed to create test case" },
      { status: 500 }
    );
  }
}
