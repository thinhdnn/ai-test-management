import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-utils";
import { createNewVersion } from "@/lib/version-utils";
import { TestCase, TestStep } from "@prisma/client";
import fs from "fs";
import path from "path";
import { toValidFileName } from "@/lib/utils";

// Define proper type for test steps with tags
type TestCaseWithRelations = TestCase & {
  testSteps: TestStep[];
  tags: { name: string }[] | string | null;
};

// Define the request body type
interface ConsolidateRequestBody {
  preserveImports?: boolean;
  preserveFixtures?: boolean;
  preserveSetup?: boolean;
  preserveTeardown?: boolean;
  cleanupAndRebuild?: boolean;
}

/**
 * Consolidates all test steps into a Playwright script by concatenating the playwrightCode
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    // Await params before using
    const resolvedParams = await params;
    const { id: projectId, testCaseId } = resolvedParams;

    // Define default options
    const defaultOptions: ConsolidateRequestBody = {
      preserveImports: true,
      preserveFixtures: true,
      preserveSetup: true,
      preserveTeardown: true,
      cleanupAndRebuild: false,
    };

    // Safely parse request body with fallback to defaults
    let body = defaultOptions;

    try {
      // Check if body is readable and not empty
      const contentType = request.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        // Clone the request to avoid "body already read" errors
        const clonedRequest = request.clone();
        const text = await clonedRequest.text();

        if (text && text.trim()) {
          try {
            const parsedBody = JSON.parse(text);
            body = { ...defaultOptions, ...parsedBody };
          } catch (jsonError) {
            console.warn("Failed to parse JSON body:", jsonError);
          }
        }
      }
    } catch (error) {
      console.warn("Error processing request body, using defaults:", error);
    }

    const { preserveImports } = body;

    // Get current user ID
    const userId = getCurrentUserId(request);

    // Fetch the test case with its steps
    const testCase = (await prisma.testCase.findUnique({
      where: { id: testCaseId },
      include: {
        testSteps: {
          where: { disabled: false },
          orderBy: { order: "asc" },
        },
        project: true, // Include project to get the base URL
      },
    })) as TestCaseWithRelations & {
      project: { url: string; playwrightProjectPath: string | null };
    };

    if (!testCase) {
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    // Get active steps (not disabled)
    const activeSteps = testCase.testSteps.filter((step) => !step.disabled);

    if (activeSteps.length === 0) {
      // Don't treat empty steps as an error, just return a minimal valid test script
      const emptyScript = generateEmptyTestScript(testCase, [], { preserveImports });
      
      // Update the test case with the empty script
      await prisma.testCase.update({
        where: { id: testCaseId },
        data: {
          playwrightCodeSource: emptyScript,
          updatedAt: new Date(),
        },
      });
      
      // Write to file if project has a Playwright path
      let scriptFilePath = "";
      if (testCase.project.playwrightProjectPath) {
        const testFileName = `${toValidFileName(testCase.name)}.spec.ts`;
        const testsDir = path.join(
          testCase.project.playwrightProjectPath,
          "tests"
        );

        // Ensure the directory exists
        if (!fs.existsSync(testsDir)) {
          fs.mkdirSync(testsDir, { recursive: true });
        }

        scriptFilePath = path.join(testsDir, testFileName);

        // Write to the file
        fs.writeFileSync(scriptFilePath, emptyScript, "utf-8");
        console.log(`Updated empty Playwright test file at: ${scriptFilePath}`);
      }
      
      return NextResponse.json({
        success: true,
        playwrightScript: emptyScript,
        filePath: scriptFilePath || null,
        message: "No active test steps found, created an empty test script"
      });
    }

    // Lấy thông tin về các fixtures được sử dụng
    const fixtureIds = activeSteps
      .filter(step => (step as any).fixtureId)
      .map(step => (step as any).fixtureId);
      
    const fixtures = fixtureIds.length > 0 
      ? await prisma.fixture.findMany({
          where: { id: { in: fixtureIds } }
        })
      : [];

    // Simply combine existing playwrightCode from steps
    const playwrightScript = combineStepCode(testCase, activeSteps, fixtures, {
      preserveImports,
    });

    // Write to file if project has a Playwright path
    let scriptFilePath = "";
    if (testCase.project.playwrightProjectPath) {
      const testFileName = `${toValidFileName(testCase.name)}.spec.ts`;
      const testsDir = path.join(
        testCase.project.playwrightProjectPath,
        "tests"
      );

      // Ensure the directory exists
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
      }

      scriptFilePath = path.join(testsDir, testFileName);

      // Write to the file
      fs.writeFileSync(scriptFilePath, playwrightScript, "utf-8");
      console.log(`Updated Playwright test file at: ${scriptFilePath}`);
    }

    // Always update the test case in the database
    await prisma.testCase.update({
      where: { id: testCaseId },
      data: {
        playwrightCodeSource: playwrightScript,
        updatedAt: new Date(),
      },
    });

    // Create a new version after consolidation
    try {
      if (userId) {
        // Convert testCase to match TestCase interface
        const testCaseForVersion = {
          id: testCase.id,
          name: testCase.name,
          description: testCase.description || '',
          status: testCase.status,
          createdAt: testCase.createdAt,
          updatedAt: testCase.updatedAt,
          lastRun: testCase.lastRun,
          createdBy: testCase.createdBy,
          updatedBy: testCase.updatedBy,
          lastRunBy: testCase.lastRunBy,
          tags: testCase.tags,
          projectId: testCase.projectId,
          version: testCase.version,
          isManual: testCase.isManual,
          playwrightTestScript: testCase.playwrightTestScript || null,
          playwrightCodeSource: testCase.playwrightCodeSource || undefined,
          testFilePath: testCase.testFilePath || undefined
        };
        await createNewVersion(testCaseForVersion, userId, testCase.version || '1.0.0');
      }
    } catch (error) {
      console.error("Error creating version after consolidation:", error);
      // Continue even if version creation fails
    }

    return NextResponse.json({
      success: true,
      playwrightScript,
      filePath: scriptFilePath || null,
    });
  } catch (error) {
    console.error("Error consolidating test steps:", error);
    return NextResponse.json(
      { error: "Failed to consolidate test steps", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Parse tags from testCase, handling different formats
 */
function parseTags(testCase: TestCaseWithRelations): string[] {
  // Return empty array if no tags
  if (!testCase.tags) return [];

  try {
    // If tags is a string (common case in DB)
    if (typeof testCase.tags === "string") {
      // Try to parse as JSON
      if (testCase.tags.trim().startsWith("[")) {
        try {
          const parsedTags = JSON.parse(testCase.tags);
          // Ensure we have an array of strings
          if (Array.isArray(parsedTags)) {
            return parsedTags.map((tag) =>
              typeof tag === "string" ? tag.trim() : String(tag).trim()
            );
          }
        } catch (e) {
          console.warn("Failed to parse tags JSON:", e);
        }
      }

      // If not JSON or parsing failed, split by comma
      return testCase.tags.split(",").map((tag) => tag.trim());
    }

    // If tags is already an array of objects (e.g. with name property)
    if (Array.isArray(testCase.tags)) {
      // Type assertion to help TypeScript understand the structure
      const objTags = testCase.tags as { name: string }[];
      return objTags.map((tag) => {
        if (typeof tag === "object" && tag !== null && tag.name) {
          return tag.name.trim();
        }
        return String(tag).trim();
      });
    }
  } catch (error) {
    console.warn("Error parsing tags:", error);
  }

  return [];
}

/**
 * Generates an empty test script structure when no steps are available
 */
function generateEmptyTestScript(
  testCase: TestCaseWithRelations, 
  fixtures: any[] = [],
  options: { preserveImports?: boolean } = {}
): string {
  const { preserveImports = true } = options;
  const tags = parseTags(testCase);
  // Format tags properly
  let tagsStr = '';
  if (tags && tags.length > 0) {
    // Clean up the tag values and ensure @ prefix
    const formattedTags = tags.map(tag => {
      // Remove @ if it exists, then add it back to ensure consistent format
      const cleanTag = tag.replace(/^@/, '');
      return `'@${cleanTag}'`;
    });
    
    tagsStr = `, {
  tag: [${formattedTags.join(', ')}]
}`;
  }
  
  return `import { test, expect } from '@playwright/test';

test('${testCase.name}'${tagsStr}, async ({ page }) => {
  // No active test steps
  console.log('This test has no active steps');
});
`;
}

/**
 * Simple function to combine step code directly from the playwrightCode of steps
 */
function combineStepCode(
  testCase: TestCaseWithRelations,
  steps: TestStep[],
  fixtures: any[] = [],
  options: {
    preserveImports?: boolean;
  } = {}
): string {
  const { preserveImports = true } = options;
  let script = "";

  // Xử lý thông tin fixtures
  const fixtureMap = fixtures.reduce((map, fixture) => {
    try {
      // Parse content để lấy thông tin fixture
      let fixtureInfo = {};
      if (fixture.content) {
        try {
          fixtureInfo = JSON.parse(fixture.content);
        } catch (e) {
          console.warn(`Could not parse fixture content for ${fixture.id}`);
        }
      }
      
      map[fixture.id] = {
        id: fixture.id,
        name: fixture.name,
        exportName: (fixtureInfo as any).exportName || fixture.name.replace(/[^a-z0-9]/gi, '').toLowerCase(),
        path: (fixtureInfo as any).path || `fixtures/${fixture.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        type: fixture.type
      };
      return map;
    } catch (error) {
      console.error(`Error processing fixture ${fixture.id}:`, error);
      return map;
    }
  }, {} as Record<string, any>);
  
  // Add imports
  if (preserveImports) {
    // Import Playwright test và expect 
    script += `import { expect } from '@playwright/test';\n`;
    
    if (fixtures.length === 0) {
      // Nếu không có fixtures, import test từ @playwright/test
      script += `import { test } from '@playwright/test';\n\n`;
    } else {
      // Nếu có fixtures, import và compose fixtures
      
      // Import fixtures
      const uniqueFixtureImports = [...new Set(
        fixtures.map(fixture => {
          const info = fixtureMap[fixture.id];
          return `import { test as ${info.exportName}Test } from '${info.path}';`;
        })
      )];
      
      script += uniqueFixtureImports.join('\n');
      script += '\n\n';
      
      // Compose fixtures nếu có nhiều hơn 1
      if (fixtures.length === 1) {
        const info = fixtureMap[fixtures[0].id];
        script += `const test = ${info.exportName}Test;\n\n`;
      } else {
        // Compose nhiều fixtures
        const fixtureInfos = fixtures.map(f => fixtureMap[f.id]);
        script += `// Compose multiple fixtures\n`;
        script += `const test = ${fixtureInfos[0].exportName}Test`;
        
        for (let i = 1; i < fixtureInfos.length; i++) {
          script += `.extend(${fixtureInfos[i].exportName}Test)`;
        }
        
        script += `;\n\n`;
      }
    }
  }

  // Parse tags from testCase
  const tags = parseTags(testCase);

  // Format tags properly
  let tagsStr = '';
  if (tags && tags.length > 0) {
    // Clean up the tag values and ensure @ prefix
    const formattedTags = tags.map(tag => {
      // Remove @ if it exists, then add it back to ensure consistent format
      const cleanTag = tag.replace(/^@/, '');
      return `'@${cleanTag}'`;
    });
    
    tagsStr = `, {
  tag: [${formattedTags.join(', ')}]
}`;
  }

  // Start test function
  script += `test('${testCase.name.replace(
    /'/g,
    "\\'"
  )}'${tagsStr}, async ({ page${fixtures.length > 0 ? ', ' + fixtures.map(f => fixtureMap[f.id].exportName).join(', ') : ''} }) => {
  // Set default timeout
  page.setDefaultTimeout(30000);\n\n`;
  script += `  await page.goto('/');\n\n`;

  // Add each step's Playwright code
  steps.forEach((step, index) => {
    // Kiểm tra step có được liên kết với fixture không
    const fixtureId = (step as any).fixtureId;
    
    if (fixtureId && fixtureMap[fixtureId]) {
      // Xử lý fixture step - đặt trực tiếp vào test
      const fixture = fixtureMap[fixtureId];
      script += `  // Step ${index + 1}: ${step.action} (Using fixture: ${fixture.name})\n`;
      script += `  // Fixture '${fixture.name}' is already injected into the test function\n`;
      script += `  // No additional code needed as the fixture is auto-applied\n\n`;
    }
    else if (step.playwrightCode) {
      script += `  // Step ${index + 1}: ${step.action} ${step.data || ""}\n`;
      // Add the code with proper indentation
      const indentedCode = step.playwrightCode
        .split("\n")
        .map((line) => (line ? `  ${line}` : line))
        .join("\n");
      script += `${indentedCode}\n\n`;
    } else {
      // If step doesn't have playwrightCode, add a comment
      script += `  // Step ${index + 1}: ${step.action} ${
        step.data || ""
      } (No code available)\n`;
      script += `  // TODO: Add implementation for this step\n\n`;
    }
  });

  // Close test function
  script += `});\n`;

  return script;
}
