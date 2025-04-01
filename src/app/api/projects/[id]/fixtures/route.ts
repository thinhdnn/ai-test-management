import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserId, AuditFields } from "@/lib/auth-utils";
import path from "path";
import fs from "fs";

// Fixture input validation schema
const fixtureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.string().default("data"),
  content: z.string().optional(),
  tags: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the project ID from params
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    // Get the fixtures for this project
    const fixtures = await prisma.fixture.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(fixtures);
  } catch (error) {
    console.error("Error fetching fixtures:", error);
    return NextResponse.json(
      { error: "Failed to fetch fixtures" },
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

    // Find project information
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    // Verify project path exists
    if (project.playwrightProjectPath) {
      if (!fs.existsSync(project.playwrightProjectPath)) {
        console.error(`Project path does not exist: ${project.playwrightProjectPath}`);
        return NextResponse.json(
          { error: "Project path does not exist" }, 
          { status: 400 }
        );
      }
    }

    // Create new fixture
    const newFixture = await prisma.fixture.create({
      data: {
        name: body.name,
        description: body.description || "",
        type: body.type || "setup",
        projectId: projectId,
        ...AuditFields.forCreate(userId),
      },
    });

    console.log(`Created new fixture in database: ${newFixture.id}`);

    // If project has Playwright path, create new fixture file
    if (project.playwrightProjectPath) {
      try {
        // Import PlaywrightService
        const { PlaywrightService } = await import("@/lib/playwright-service");

        console.log(`Generating Playwright fixture file for fixture: ${newFixture.id}`);
        console.log(`Project path: ${project.playwrightProjectPath}`);
        console.log(`Base URL: ${project.url}`);

        // Ensure the fixtures directory exists
        const fixturesDir = path.join(project.playwrightProjectPath, 'fixtures');
        if (!fs.existsSync(fixturesDir)) {
          fs.mkdirSync(fixturesDir, { recursive: true });
          console.log(`Created fixtures directory: ${fixturesDir}`);
        }

        const fixtureFilePath = path.join(fixturesDir, 'fixtures.ts');
        
        // Tạo tên biến cho fixture (đảm bảo là camelCase hợp lệ)
        const fixtureVarName = body.name
          .split(/[-_\s]+/)
          .map((word: string, index: number) => 
            index === 0 
              ? word.toLowerCase() 
              : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join('');

        // Get all existing fixtures for this project
        const allFixtures = await prisma.fixture.findMany({
          where: { projectId: projectId },
          orderBy: { createdAt: 'asc' }
        });

        // Helper function to convert to camelCase
        const toCamelCase = (str: string) => {
          return str
            .split(/[-_\s]+/)
            .map((word: string, index: number) => 
              index === 0 
                ? word.toLowerCase() 
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join('');
        };

        // Generate combined fixture content
        let fixtureContent = `import { test as base, Page } from '@playwright/test';

interface Fixtures {
${allFixtures.map(f => `  ${toCamelCase(f.name)}: Page`).join(',\n')}
}

// Extend base test with fixtures
export const test = base.extend<Fixtures>({
${allFixtures.map(f => {
  const camelCaseName = toCamelCase(f.name);
  return `  ${camelCaseName}: async ({ page }, use) => {
    // ${f.name} fixture
    // Type: ${f.type || "setup"}
    // Description: ${f.description || ""}
    // ID: ${f.id}
    
    // Setup phase - prepare environment before running tests
    
    // TODO: Implement fixture setup logic here
    
    // Use the fixture value in the test
    await use(page);
  }`}).join(',\n\n')}
});

export { expect } from '@playwright/test';`;

        // Write file
        fs.writeFileSync(fixtureFilePath, fixtureContent);
        console.log(`Successfully updated fixtures file at: ${fixtureFilePath}`);
        
        // Update fixture with the file path
        await prisma.fixture.update({
          where: { id: newFixture.id },
          data: { 
            fixtureFilePath: path.relative(project.playwrightProjectPath, fixtureFilePath),
            content: JSON.stringify({
              exportName: fixtureVarName,
              path: '../fixtures/fixtures',
              filename: 'fixtures.ts'
            })
          },
        });
      } catch (error) {
        console.error("Error creating Playwright fixture file:", error);
        console.error(`Failed to create fixture file for fixture ${newFixture.id} in project ${projectId}`);
        console.error(`Project path: ${project.playwrightProjectPath}`);
        console.error(`Error details:`, error);
      }
    }

    return NextResponse.json(
      {
        success: true,
        fixture: newFixture,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating fixture:", error);
    return NextResponse.json(
      { error: "Failed to create fixture" },
      { status: 500 }
    );
  }
} 