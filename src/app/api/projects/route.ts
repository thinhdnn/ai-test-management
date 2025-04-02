import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";
import { PlaywrightService } from "@/lib/playwright-service";
import { toValidFileName } from "@/lib/utils";
import { verify } from "jsonwebtoken";
import { getCurrentUserId, AuditFields } from "@/lib/auth-utils";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        _count: {
          select: { testCases: true },
        },
        testCases: {
          select: {
            status: true,
          },
        },
      },
    });

    // Transform data to match the structure used in the frontend
    const transformedProjects = projects.map((project) => {
      const passed = project.testCases.filter(
        (tc) => tc.status === "passed"
      ).length;
      const failed = project.testCases.filter(
        (tc) => tc.status === "failed"
      ).length;
      const pending = project.testCases.filter(
        (tc) => tc.status === "pending"
      ).length;

      return {
        id: project.id,
        name: project.name,
        description: project.description || "",
        url: project.url,
        browser: project.browser,
        environment: project.environment,
        createdAt: project.createdAt,
        testCases: {
          total: project._count.testCases,
          passed,
          failed,
          pending,
        },
      };
    });

    return NextResponse.json(transformedProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validate the data
    if (!data.name || !data.url || !data.environment) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get current user ID
    const userId = getCurrentUserId(request);

    // Create project in database
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description || "",
        url: data.url,
        environment: data.environment,
        library: data.library || null,
        ...AuditFields.forCreate(userId),
      },
    });

    // Create Playwright project directory with valid folder name
    const projectDirName = toValidFileName(data.name);
    const projectPath = path.join('/tmp', 'playwright-projects', projectDirName);
    const tempDir = path.join('/tmp', 'playwright-projects');

    // Create directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    

    // Initialize Playwright project using our service
    try {
      const initResult = await PlaywrightService.initProject({
        projectPath,
        browser: "chromium",
        baseUrl: data.url,
        useTypescript: true,
        usePOM: true,
        useGitHub: false,
      });

      if (initResult.success) {
        console.log("Playwright project initialized successfully");

        // Create config file with project settings
        const projectConfig = {
          url: data.url,
          environment: data.environment,
          libraries: data.library,
        };

        fs.writeFileSync(
          path.join(projectPath, "project-config.json"),
          JSON.stringify(projectConfig, null, 2)
        );
      } else {
        console.error(
          "Failed to initialize Playwright project:",
          initResult.output
        );
        console.log("Trying to create directory structure manually...");

        // Create a minimal structure even if initialization failed
        const testsDir = path.join(projectPath, "tests");
        if (!fs.existsSync(testsDir)) {
          fs.mkdirSync(testsDir, { recursive: true });
        }

        // Create a basic package.json file
        const packageJson = {
          name: path.basename(projectPath),
          version: "1.0.0",
          description: "Playwright Test Project",
          scripts: {
            test: "playwright test",
          },
        };
        fs.writeFileSync(
          path.join(projectPath, "package.json"),
          JSON.stringify(packageJson, null, 2)
        );
      }

      // Update the project in the database with the folder path
      await prisma.project.update({
        where: { id: project.id },
        data: {
          playwrightProjectPath: projectPath,
        },
      });
    } catch (error) {
      console.error("Error initializing Playwright project:", error);
      // Still return success for the API but log the error
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
