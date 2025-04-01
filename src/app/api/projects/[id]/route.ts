import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";
import { getCurrentUserId, AuditFields } from "@/lib/auth-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before using
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // Find the project by ID
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        testCases: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get user information if created_by exists
    let createdByUsername = null;
    if (project.created_by) {
      const user = await prisma.user.findUnique({
        where: { id: project.created_by },
        select: { username: true },
      });

      if (user) {
        createdByUsername = user.username;
      }
    }

    // Get last run by username if exists
    let lastRunByUsername = null;
    if (project.lastRunBy) {
      const user = await prisma.user.findUnique({
        where: { id: project.lastRunBy },
        select: { username: true },
      });

      if (user) {
        lastRunByUsername = user.username;
      }
    }

    // Count test cases by status
    const testCaseCounts = {
      total: project.testCases.length,
      passed: project.testCases.filter((tc) => tc.status === "passed").length,
      failed: project.testCases.filter((tc) => tc.status === "failed").length,
      pending: project.testCases.filter((tc) => tc.status === "pending").length,
    };

    // Return project with test case counts but not the actual test cases
    return NextResponse.json({
      ...project,
      created_by_username: createdByUsername,
      lastRunBy_username: lastRunByUsername,
      testCases: testCaseCounts,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const data = await request.json();

    // Get current user ID
    const userId = getCurrentUserId(request);

    // Validate the data
    if (!data.name || !data.url || !data.environment) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Update project in database
    const updatedProject = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        name: data.name,
        description: data.description,
        url: data.url,
        browser: data.browser || null,
        environment: data.environment,
        library: data.library,
        ...AuditFields.forUpdate(userId),
      },
      include: {
        testCases: true,
      },
    });

    // Transform the data for the frontend
    const transformedProject = {
      id: updatedProject.id,
      name: updatedProject.name,
      description: updatedProject.description,
      url: updatedProject.url,
      browser: updatedProject.browser,
      environment: updatedProject.environment,
      library: updatedProject.library,
      createdAt: updatedProject.createdAt.toISOString(),
      updatedAt: updatedProject.updatedAt.toISOString(),
      testCases: {
        total: updatedProject.testCases.length,
        passed: updatedProject.testCases.filter((tc) => tc.status === "passed")
          .length,
        failed: updatedProject.testCases.filter((tc) => tc.status === "failed")
          .length,
        pending: updatedProject.testCases.filter(
          (tc) => tc.status === "pending"
        ).length,
      },
    };

    return NextResponse.json(transformedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    // Check if the project exists
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        testCases: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete Playwright project folder if it exists
    if (
      project.playwrightProjectPath &&
      fs.existsSync(project.playwrightProjectPath)
    ) {
      try {
        fs.rmSync(project.playwrightProjectPath, {
          recursive: true,
          force: true,
        });
        console.log(
          `Deleted Playwright folder: ${project.playwrightProjectPath}`
        );
      } catch (error) {
        console.error("Error deleting Playwright folder:", error);
        // Don't return an error because the Playwright folder is not critical data
      }
    }

    // Delete project (cascade delete will also delete test cases and test steps)
    await prisma.project.delete({
      where: {
        id: projectId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
