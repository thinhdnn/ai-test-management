import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PlaywrightService } from "@/lib/playwright-service";
import fs from "fs";
import path from "path";

interface PlaywrightConfig {
  testDir?: string;
  baseURL?: string;
  timeout?: number;
  retries?: number;
  workers?: number;
  reporter?: string | Array<string | [string, any]>;
  fullyParallel?: boolean;
  forbidOnly?: boolean;
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  [key: string]: any;
}

/**
 * API routes for managing Playwright project configuration
 *
 * GET: Get current Playwright configuration information
 * PATCH: Update Playwright configuration
 */

/**
 * GET: Get current Playwright configuration information
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    // Find project by ID
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project does not exist" },
        { status: 404 }
      );
    }

    if (!project.playwrightProjectPath) {
      return NextResponse.json(
        { error: "Project has not been initialized with Playwright" },
        { status: 400 }
      );
    }

    // Trả về cấu hình từ Playwright config và project-config.json
    try {
      // Read project-config.json
      const projectConfigPath = path.join(
        project.playwrightProjectPath,
        "project-config.json"
      );

      let projectConfig = {
        url: project.url,
        browser: project.browser,
        environment: project.environment,
        libraries: project.library,
      };

      if (fs.existsSync(projectConfigPath)) {
        try {
          const projectConfigData = JSON.parse(
            fs.readFileSync(projectConfigPath, "utf8")
          );
          projectConfig = {
            ...projectConfig,
            ...projectConfigData,
          };
        } catch (err) {
          console.error("Error reading project-config.json:", err);
        }
      }

      // Đọc playwright.config.ts/js
      const playwrightConfigPath = path.join(
        project.playwrightProjectPath,
        "playwright.config.ts"
      );

      let playwrightConfig: PlaywrightConfig = {};

      if (fs.existsSync(playwrightConfigPath)) {
        try {
          // Chúng ta không thể import trực tiếp file TS, nhưng có thể đọc nội dung và phân tích
          const configContent = fs.readFileSync(playwrightConfigPath, "utf8");

          // Parse một số cấu hình phổ biến
          playwrightConfig = {
            testDir: parseConfig(configContent, "testDir"),
            baseURL: parseConfig(configContent, "baseURL"),
            timeout: parseConfig(configContent, "timeout", true),
            retries: parseConfig(configContent, "retries", true),
            workers: parseConfig(configContent, "workers", true),
            reporter: parseConfig(configContent, "reporter"),
            fullyParallel: parseConfig(configContent, "fullyParallel", true),
            forbidOnly: parseConfig(configContent, "forbidOnly", true),
            headless: parseConfig(configContent, "headless", true),
          };

          // Parse các cấu hình khác

          // Viewport
          const viewportMatch = configContent.match(
            /viewport:\s*{\s*width:\s*(\d+),\s*height:\s*(\d+)/
          );
          if (viewportMatch) {
            playwrightConfig.viewport = {
              width: parseInt(viewportMatch[1], 10),
              height: parseInt(viewportMatch[2], 10),
            };
          }

          // Projects (browsers)
          const browsers = {
            chromium: configContent.includes("name: 'chromium'"),
            firefox: configContent.includes("name: 'firefox'"),
            webkit: configContent.includes("name: 'webkit'"),
            chrome: configContent.includes("name: 'chrome'"),
            msedge: configContent.includes("name: 'msedge'"),
          };

          if (Object.values(browsers).some(Boolean)) {
            playwrightConfig.browsers = browsers;
          }
        } catch (err) {
          console.error("Error reading playwright.config.ts:", err);
        }
      }

      // Return configuration from Playwright config and project-config.json
      const configData = {
        id: project.id,
        name: project.name,
        url: project.url,
        playwrightPath: project.playwrightProjectPath,
        browser: project.browser,
        environment: project.environment,
        config: playwrightConfig,
      };

      return NextResponse.json({
        ...projectConfig,
        ...configData,
      });
    } catch (error) {
      console.error("Error reading Playwright configuration:", error);
      return NextResponse.json(
        { error: "Unable to read Playwright configuration" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error retrieving configuration information:", error);
    return NextResponse.json(
      { error: "Error retrieving configuration information" },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update Playwright configuration
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const data = await request.json();

    // Find project by ID
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project does not exist" },
        { status: 404 }
      );
    }

    if (!project.playwrightProjectPath) {
      return NextResponse.json(
        { error: "Project has not been initialized with Playwright" },
        { status: 400 }
      );
    }

    // Update basic information in database
    const updatedProject = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        url: data.baseUrl || project.url,
        browser: data.browser || project.browser,
        environment: data.environment || project.environment,
        library: data.libraries || project.library,
      },
    });

    // Prepare configuration for PlaywrightService
    const config: PlaywrightConfig = {
      // Basic configuration
      baseUrl: data.baseUrl,
      testDir: data.testDir,
      fullyParallel:
        data.fullyParallel === true || data.fullyParallel === "true",
      forbidOnly: data.forbidOnly === true || data.forbidOnly === "true",
      retries: data.retries ? parseInt(data.retries as string, 10) : undefined,
      workers: data.workers ? parseInt(data.workers as string, 10) : undefined,
      reporters: data.reporters,
      reportFileNames: data.reportFileNames,

      // Test filtering configuration
      testIgnore: data.testIgnore as string,
      testMatch: data.testMatch as string,

      // Advanced configuration
      outputDir: data.outputDir,
      globalSetup: data.globalSetup,
      globalTeardown: data.globalTeardown,
      timeout: data.timeout ? parseInt(data.timeout as string, 10) : undefined,

      // Expect options
      expect: {
        timeout: data.expectTimeout
          ? parseInt(data.expectTimeout as string, 10)
          : undefined,
      },

      // Emulation options
      colorScheme: data.colorScheme as string,
      geolocation: data.geolocation as string,
      locale: data.locale as string,
      permissions: data.permissions as string,
      timezoneId: data.timezoneId as string,
      viewport: data.viewport,

      // Network options
      acceptDownloads:
        data.acceptDownloads === true || data.acceptDownloads === "true",
      extraHTTPHeaders: data.extraHTTPHeaders as string,
      httpCredentials: data.httpCredentials as string,
      ignoreHTTPSErrors:
        data.ignoreHTTPSErrors === true || data.ignoreHTTPSErrors === "true",
      offline: data.offline === true || data.offline === "true",
      proxy: data.proxy as string,

      // Logging options - these are string enum values, not booleans
      screenshot: data.screenshot as
        | "off"
        | "on"
        | "only-on-failure"
        | "retain-on-failure",
      trace: data.trace as
        | "off"
        | "on"
        | "retain-on-failure"
        | "on-first-retry"
        | "on-all-retries",
      video: data.video as
        | "off"
        | "on"
        | "retain-on-failure"
        | "on-first-retry",

      // Other options
      actionTimeout: data.actionTimeout
        ? parseInt(data.actionTimeout as string, 10)
        : undefined,
      navigationTimeout: data.navigationTimeout
        ? parseInt(data.navigationTimeout as string, 10)
        : undefined,
      browserName: data.browserName,
      bypassCSP: data.bypassCSP === true || data.bypassCSP === "true",
      channel: data.channel as string,
      headless: data.headless === true || data.headless === "true",
      testIdAttribute: data.testIdAttribute as string,

      // Projects configuration
      browsers: data.browsers,

      // WebServer configuration
      webServer: data.webServer
        ? {
            command: data.webServerCommand,
            url: data.webServerUrl,
            timeout: data.webServerTimeout
              ? parseInt(data.webServerTimeout as string, 10)
              : undefined,
            reuseExistingServer: data.webServerReuseExisting === "true",
          }
        : undefined,

      // Use options
      use: data.use,
    };

    // Update Playwright configuration
    try {
      // Use the new method to create a fresh config file with exact format
      const updateResult = await PlaywrightService.createExactPlaywrightConfig(
        project.playwrightProjectPath,
        config
      );

      if (!updateResult.success) {
        return NextResponse.json(
          { error: updateResult.message },
          { status: 500 }
        );
      }

      // Return success response
      return NextResponse.json({
        message: "Playwright configuration updated successfully",
        url: updatedProject.url,
      });
    } catch (error) {
      console.error("Error updating Playwright configuration:", error);
      return NextResponse.json(
        { error: "Failed to update Playwright configuration" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating configuration:", error);
    return NextResponse.json(
      {
        error: "Error updating configuration",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to parse configurations from file content
 */
function parseConfig(content: string, key: string, isNumber = false): any {
  // Special handling for reporter
  if (key === 'reporter') {
    const reporterMatch = content.match(/reporter\s*:\s*(\[[\s\S]*?\]|\s*['"][^'"]*['"]\s*)/);
    if (reporterMatch) {
      try {
        // Check if it's a string reporter (simple format)
        if (reporterMatch[1].trim().startsWith("'") || reporterMatch[1].trim().startsWith('"')) {
          // It's a simple string like 'html'
          const simpleReporter = reporterMatch[1].trim().replace(/['"]/g, '');
          return [simpleReporter]; // Return as array for consistency
        }
        
        // It's an array, try to parse it
        const arrayContent = reporterMatch[1].trim();
        // Extract reporter names directly using regex instead of JSON.parse
        const reporterNames: string[] = [];
        const reporterNameRegex = /\[\s*['"]([^'"]+)['"]/g;
        let match;
        while ((match = reporterNameRegex.exec(arrayContent)) !== null) {
          reporterNames.push(match[1]);
        }
        
        return reporterNames.length > 0 ? reporterNames : ['html']; // Default to html if parsing fails
      } catch (err) {
        console.error('Error parsing reporter config:', err);
        return ['html']; // Default to html on error
      }
    }
    return ['html']; // Default reporter
  }

  // Handle other config values
  const match = content.match(new RegExp(`${key}\\s*:\\s*([^,}\\n]+)`));
  if (!match) return undefined;

  const value = match[1].trim();
  
  if (isNumber) {
    return parseInt(value, 10);
  }

  // Remove quotes and handle true/false
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value.replace(/['"]/g, '');
}
