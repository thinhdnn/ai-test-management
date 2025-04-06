import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { toValidFileName } from "@/lib/utils";
import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "@/lib/prisma";
import util from "util";
import {
  PlaywrightInitOptions,
} from "@/types";

/**
 * Playwright project configuration
 */
interface PlaywrightConfig {
  // Basic configuration
  testDir?: string;
  fullyParallel?: boolean;
  forbidOnly?: boolean;
  retries?: number;
  workers?: number | string;
  reporter?: string | Array<string | [string, any]>;

  // Test filtering configuration
  testIgnore?: string | RegExp | Array<string | RegExp>;
  testMatch?: string | RegExp | Array<string | RegExp>;

  // Advanced configuration
  outputDir?: string;
  globalSetup?: string;
  globalTeardown?: string;
  timeout?: number;

  // Expect options
  expect?: {
    timeout?: number;
    toHaveScreenshot?: {
      maxDiffPixels?: number;
      threshold?: number;
      maxDiffPixelRatio?: number;
    };
    toMatchSnapshot?: {
      threshold?: number;
      maxDiffPixelRatio?: number;
    };
  };

  // Basic usage options
  baseUrl?: string;
  storageState?:
    | string
    | {
        cookies?: Array<{
          name: string;
          value: string;
          domain?: string;
          path?: string;
          expires?: number;
          httpOnly?: boolean;
          secure?: boolean;
          sameSite?: "Strict" | "Lax" | "None";
        }>;
        origins?: Array<{
          origin: string;
          localStorage: Array<{
            name: string;
            value: string;
          }>;
        }>;
      };

  // Emulation options
  colorScheme?: "light" | "dark" | "no-preference";
  geolocation?: { longitude: number; latitude: number; accuracy?: number };
  locale?: string;
  permissions?: string[];
  timezoneId?: string;
  viewport?: { width: number; height: number };

  // Network options
  acceptDownloads?: boolean;
  extraHTTPHeaders?: Record<string, string>;
  httpCredentials?: { username: string; password: string };
  ignoreHTTPSErrors?: boolean;
  offline?: boolean;
  proxy?: {
    server: string;
    bypass?: string;
    username?: string;
    password?: string;
  };

  // Recording options
  screenshot?: "off" | "on" | "only-on-failure" | "retain-on-failure";
  trace?:
    | "off"
    | "on"
    | "retain-on-failure"
    | "on-first-retry"
    | "on-all-retries";
  video?: "off" | "on" | "retain-on-failure" | "on-first-retry";

  // Other options
  actionTimeout?: number;
  navigationTimeout?: number;
  browserName?: "chromium" | "firefox" | "webkit";
  bypassCSP?: boolean;
  channel?:
    | "chrome"
    | "chrome-beta"
    | "chrome-dev"
    | "chrome-canary"
    | "msedge"
    | "msedge-beta"
    | "msedge-dev"
    | "msedge-canary";
  headless?: boolean;
  testIdAttribute?: string;

  // Projects configuration
  browsers?: {
    chromium?: boolean;
    firefox?: boolean;
    webkit?: boolean;
    chrome?: boolean;
    msedge?: boolean;
  };

  // WebServer configuration
  webServer?: {
    command: string;
    url: string;
    timeout?: number;
    reuseExistingServer?: boolean;
    stdout?: "pipe" | "ignore";
    stderr?: "pipe" | "ignore";
    env?: Record<string, string>;
    cwd?: string;
  };

  // Launch and context options
  launchOptions?: Record<string, any>;
  contextOptions?: Record<string, any>;

  // Used to pass additional custom options
  use?: Record<string, any>;

  // New fields for reporter configuration
  reporters?: string[];
  reportFileNames?: Record<string, string>;
}

const execAsync = promisify(exec);

/**
 * Service to handle interactions with Playwright CLI
 */
export class PlaywrightService {
  /**
   * Initializes a new Playwright project with automated responses to CLI prompts
   */
  static async initProject(
    options: PlaywrightInitOptions
  ): Promise<{ success: boolean; output: string }> {
    const {
      projectPath,
      browser,
      testDir = "tests",
      baseUrl,
      useTypescript = true,
      usePOM = false,
      useGitHub = false,
    } = options;

    // Create project directory if it doesn't exist
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    return new Promise((resolve) => {
      // Commands and expected prompts
      let outputLog = "";
      let command = "npx create-playwright@latest --quiet --install-deps";

      // Add language option
      if (!useTypescript) {
        command += " --lang=js";
      }

      // Add GitHub Actions option
      if (useGitHub) {
        command += " --gha";
      }

      console.log(`Executing: ${command} in ${projectPath}`);

      const childProcess = spawn(command, {
        cwd: projectPath,
        shell: true,
        stdio: "pipe",
      });

      childProcess.stdout.on("data", (data) => {
        const output = data.toString();
        outputLog += output;
        console.log(`Playwright Init Output: ${output}`);
      });

      childProcess.stderr.on("data", (data) => {
        const error = data.toString();
        outputLog += error;
        console.error(`Playwright Init Error: ${error}`);
      });

      childProcess.on("close", (code) => {
        console.log(
          `Playwright initialization process completed with code ${code}`
        );

        // After initialization, modify the playwright.config.ts/js file
        if (code === 0) {
          try {
            this.updatePlaywrightConfig(projectPath, {
              testDir,
              baseUrl,
              useTypescript,
            });

            // Create POM structure if requested
            if (usePOM) {
              this.createPOMStructure(projectPath, useTypescript);
            }

            // Delete example folders
            const exampleDirs = ["tests-examples", "tests/example.spec.ts"];
            exampleDirs.forEach((dir) => {
              const dirPath = path.join(projectPath, dir);
              if (fs.existsSync(dirPath)) {
                try {
                  if (fs.statSync(dirPath).isDirectory()) {
                    fs.rmSync(dirPath, { recursive: true, force: true });
                  } else {
                    fs.unlinkSync(dirPath);
                  }
                  console.log(`Deleted ${dir}`);
                } catch (error) {
                  console.error(`Error deleting ${dir}:`, error);
                }
              }
            });
          } catch (error) {
            console.error("Error configuring project:", error);
          }
        }

        resolve({
          success: code === 0,
          output: outputLog,
        });
      });
    });
  }

  /**
   * Updates the Playwright configuration file with custom settings
   */
  private static updatePlaywrightConfig(
    projectPath: string,
    options: { testDir?: string; baseUrl?: string; useTypescript?: boolean }
  ): void {
    const { testDir, baseUrl, useTypescript = true } = options;
    const configFileName = useTypescript ? "playwright.config.ts" : "playwright.config.js";
    const configPath = path.join(projectPath, configFileName);

    if (!fs.existsSync(configPath)) {
      console.warn(`${configFileName} not found in ${projectPath}`);
      return;
    }

    let configContent = fs.readFileSync(configPath, "utf8");

    // Split content into main config and projects section
    const projectsStartMatch = configContent.match(/^\s*projects\s*:/m);
    const projectsStartIndex = projectsStartMatch?.index ?? configContent.length;
    const beforeProjects = configContent.slice(0, projectsStartIndex);
    const projectsAndAfter = configContent.slice(projectsStartIndex);

    let updatedMainConfig = beforeProjects;

    // Update testDir in main config if provided
    if (testDir) {
      if (updatedMainConfig.includes('testDir:')) {
        updatedMainConfig = updatedMainConfig.replace(
          /(\s*testDir\s*:\s*['"])([^'"]*)['"]/,
          `$1${testDir}'`
        );
      }
    }

    // Update baseURL in main use section if provided
    if (baseUrl) {
      const useMatch = updatedMainConfig.match(/(\s*use\s*:\s*{[^}]*})/s);
      if (useMatch) {
        let useSection = useMatch[1];
        if (useSection.includes('baseURL:')) {
          useSection = useSection.replace(
            /(\s*baseURL\s*:\s*['"])([^'"]*)['"]/,
            `$1${baseUrl}'`
          );
        } else {
          // Add baseURL to use section
          useSection = useSection.replace(
            /(\s*use\s*:\s*{)/,
            `$1\n    baseURL: '${baseUrl}',`
          );
        }
        updatedMainConfig = updatedMainConfig.replace(/\s*use\s*:\s*{[^}]*}/s, useSection);
      }
    }

    // Update reporter in main config
    const defaultReporter = `[
    ['html'],
    ['json', { outputFile: 'test-results/test-results.json' }]
  ]`;

    if (updatedMainConfig.includes('reporter:')) {
      updatedMainConfig = updatedMainConfig.replace(
        /(\s*reporter\s*:)[^\]]*\]/s,
        `$1 ${defaultReporter}`
      );
    }

    // Combine updated main config with unchanged projects section
    const finalContent = updatedMainConfig + projectsAndAfter;

    fs.writeFileSync(configPath, finalContent);
    console.log(`Updated ${configFileName} with custom settings`);
  }

  /**
   * Creates a Page Object Model structure for better test organization
   */
  private static createPOMStructure(
    projectPath: string,
    useTypescript: boolean
  ): void {
    const extension = useTypescript ? "ts" : "js";
    const pomDirs = ["pages", "components", "fixtures", "helpers"];

    // Create POM directories
    pomDirs.forEach((dir) => {
      const dirPath = path.join(projectPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
      }
    });

    // Create base page class
    const basePageContent = useTypescript
      ? `import { Page } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  async navigate(path: string = '') {
    await this.page.goto(path);
  }
  
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}
`
      : `export class BasePage {
  constructor(page) {
    this.page = page;
  }
  
  async navigate(path = '') {
    await this.page.goto(path);
  }
  
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}
`;

    fs.writeFileSync(
      path.join(projectPath, "pages", `BasePage.${extension}`),
      basePageContent
    );
    console.log("Created POM structure");
  }

  /**
   * Runs Playwright tests and processes results
   */
  static async runProjectTests({
    projectId,
      projectPath,
    testCaseId,
      browser,
      headless = true,
    userId
  }: {
    projectId: string,
    projectPath: string,
    testCaseId?: string,
    browser?: string,
    headless?: boolean,
    userId?: string
  }): Promise<{
    success: boolean,
    output: string,
    duration?: number,
    steps?: any[],
    screenshots?: string[],
    testResults?: any,
    videoUrl?: string
  }> {
    try {
      // Use readFilePromise from the route file
      const readFilePromise = util.promisify(fs.readFile);
      const execPromise = util.promisify(exec);

      // Xóa thư mục test-results nếu đã tồn tại
      const testResultsDir = path.join(projectPath, "test-results");
      if (fs.existsSync(testResultsDir)) {
        console.log(`Removing existing test-results directory: ${testResultsDir}`);
        fs.rmSync(testResultsDir, { recursive: true, force: true });
      }

      // Tạo lại thư mục test-results trống
      fs.mkdirSync(testResultsDir, { recursive: true });

      if (testCaseId) {
        // Run specific test
        const testCase = await prisma.testCase.findUnique({
          where: {
            id: testCaseId,
            projectId: projectId,
          },
          include: {
            testSteps: {
              orderBy: {
                order: "asc",
              },
              where: {
                disabled: false,
              },
            },
          },
        });

        if (!testCase) {
          throw new Error("Test case does not exist");
        }

        // Update test case's lastRunBy
        if (userId) {
          await prisma.testCase.update({
            where: {
              id: testCaseId,
            },
            data: {
              lastRunBy: userId,
            },
          });
        }

        // Build test file name
        const testFileName = `${toValidFileName(testCase.name)}.spec.ts`;
        const testFilePath = path.join("tests", testFileName);

        // Configure Playwright options
        const browserOption = browser || "chromium";
        const headlessOption = headless ? "" : "--headed";
        const reporterOption = "--reporter=json";

        console.log("Selected browser for test:", browserOption);

        // Run specific test
        try {
          const startTime = Date.now();
          const command = `npx playwright test ${testFilePath} ${reporterOption} --project=${browserOption} ${headlessOption}`;

          console.log(`Running test command: ${command}`);

          const { stdout, stderr } = await execPromise(command, {
            cwd: projectPath,
          });

          const endTime = Date.now();
          const duration = endTime - startTime;

          // Try to parse the JSON output
          let testResults;
          let stepResults = [];
          let screenshots = [];
          let videoUrl: string | undefined = undefined;

          try {
            if (stdout) {
              testResults = JSON.parse(stdout);

              // Extract step results from the parsed JSON
              if (
                testResults &&
                testResults.suites &&
                testResults.suites.length > 0
              ) {
                const suite = testResults.suites[0];
                if (suite.specs && suite.specs.length > 0) {
                  const spec = suite.specs[0];
                  if (spec.tests && spec.tests.length > 0) {
                    const test = spec.tests[0];

                    // Parse steps from test results
                    if (test.steps) {
                      stepResults = test.steps.map((step: any, index: number) => {
                        // Map step result to test step
                        const matchingTestStep = testCase.testSteps[index];
                        return {
                          action: matchingTestStep
                            ? matchingTestStep.action
                            : step.title,
                          data: matchingTestStep ? matchingTestStep.data : null,
                          expected: matchingTestStep
                            ? matchingTestStep.expected
                            : null,
                          success: step.error ? false : true,
                          error: step.error,
                          duration: step.duration,
                        };
                      });
                    }

                    // Tìm và lưu video từ thư mục test-results
                    if (fs.existsSync(testResultsDir)) {
                      // Tìm kiếm file .webm trong thư mục test-results và các thư mục con
                      const findWebmFiles = (dir: string): string[] => {
                        let results: string[] = [];
                        const items = fs.readdirSync(dir);
                        
                        for (const item of items) {
                          const itemPath = path.join(dir, item);
                          const stat = fs.statSync(itemPath);
                          
                          if (stat.isDirectory()) {
                            results = results.concat(findWebmFiles(itemPath));
                          } else if (item.endsWith('.webm')) {
                            results.push(itemPath);
                          }
                        }
                        
                        return results;
                      };
                      
                      const webmFiles = findWebmFiles(testResultsDir);
                      
                      if (webmFiles.length > 0) {
                        // Sử dụng file đầu tiên nếu có nhiều file
                        const videoPath = webmFiles[0];
                        console.log(`Found video file: ${videoPath}`);
                        
                        try {
                          const videoBuffer = await readFilePromise(videoPath);
                          // Tạo tên file duy nhất cho video
                          const videoFileName = `test-${testCaseId}-${Date.now()}.webm`;
                          const publicVideoPath = path.join(process.cwd(), 'public', 'videos', videoFileName);
                          
                          // Sao chép file video vào thư mục public/videos
                          await fs.promises.writeFile(publicVideoPath, videoBuffer);
                          
                          // Lưu đường dẫn tương đối thay vì base64
                          videoUrl = videoFileName;
                          console.log(`Video saved to public folder: ${videoFileName}`);
                        } catch (error) {
                          console.error("Error processing video file:", error);
                        }
                      }
                      
                      // Get any screenshots from the test results directory
                      const files = fs.readdirSync(testResultsDir);
                      for (const file of files) {
                        if (file.endsWith(".png")) {
                          const screenshotPath = path.join(testResultsDir, file);
                          try {
                            const imageBuffer = await readFilePromise(
                              screenshotPath
                            );
                            const base64Image = `data:image/png;base64,${imageBuffer.toString(
                              "base64"
                            )}`;
                            screenshots.push(base64Image);
                          } catch (error) {
                            console.error("Error reading screenshot:", error);
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (parseError) {
            console.error("Error parsing test results:", parseError);
          }

          // Extract useful information from testResults
          let formattedTestResults = null;
          if (testResults) {
            // Calculate statistics
            const stats = testResults.stats || {};

            // Check result status
            const hasErrors = !!stderr;
            const hasFailedTests =
              testResults.stats && testResults.stats.unexpected > 0;
            const success = !hasErrors && !hasFailedTests;

            // Format suites for easier display
            const suites = testResults.suites?.map((suite: any) => {
              // Loại bỏ các spec trùng lặp bằng cách dùng Map để theo dõi các title đã gặp
              const uniqueSpecsMap = new Map();

              suite.specs?.forEach((spec: any) => {
                // Chỉ thêm vào Map nếu title này chưa tồn tại hoặc spec hiện tại có lỗi
                if (!uniqueSpecsMap.has(spec.title) || !spec.ok) {
                  uniqueSpecsMap.set(spec.title, spec);
                }
              });

              // Chuyển đổi từ Map về mảng specs
              const uniqueSpecs = Array.from(uniqueSpecsMap.values()).map(
                (spec: any) => {
                  // Loại bỏ các test trùng lặp trong mỗi spec
                  const uniqueTestsMap = new Map();

                  spec.tests?.forEach((test: any) => {
                    if (
                      !uniqueTestsMap.has(test.title) ||
                      test.status !== "passed"
                    ) {
                      uniqueTestsMap.set(test.title, test);
                    }
                  });

                  return {
                    title: spec.title,
                    ok: spec.ok !== undefined ? spec.ok : !hasErrors,
                    tests: Array.from(uniqueTestsMap.values()).map(
                      (test: any) => {
                        return {
                          title: test.title,
                          status: test.status,
                          passed:
                            test.status === "passed" ||
                            test.status === "expected",
                          duration: test.duration,
                          error: test.error
                            ? {
                                message: test.error.message || test.error,
                                stack: test.error.stack,
                              }
                            : null,
                        };
                      }
                    ),
                  };
                }
              );

              return {
                title: suite.title,
                specs: uniqueSpecs,
              };
            });

            formattedTestResults = {
              stats,
              suites,
              success,
            };
          }

          // Update test case status
          await prisma.testCase.update({
            where: {
              id: testCaseId,
            },
            data: {
              status: stderr ? "failed" : "passed",
              lastRun: new Date(),
            },
          });

          // Lưu kết quả test vào lịch sử
          try {
            console.log("Saving test result with browser:", browserOption);

            // Kiểm tra xem schema prisma có hỗ trợ videoUrl không
            const prismaData = {
              projectId,
              testCaseId,
              success: !stderr,
              status: stderr ? "failed" : "passed",
              executionTime: duration,
              output: stdout + (stderr ? `\nErrors:\n${stderr}` : ""),
              errorMessage: stderr || null,
              resultData: formattedTestResults
                ? JSON.stringify(formattedTestResults)
                : null,
              browser: browserOption,
              lastRunBy: userId,
              videoUrl: videoUrl || null // Thêm trực tiếp vì đã biết cột tồn tại
            };
            
            // Cột videoUrl đã tồn tại trong model TestResultHistory nên không cần kiểm tra nữa
            /*
            try {
              const testResultHistoryFields = await prisma.$queryRaw`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'TestResultHistory'
              `;
              
              const hasVideoUrlField = Array.isArray(testResultHistoryFields) && 
                testResultHistoryFields.some((field: any) => 
                  field.column_name === 'videoUrl' || field.COLUMN_NAME === 'videoUrl'
                );
              
              if (hasVideoUrlField && videoUrl) {
                // @ts-ignore - Chúng ta biết rằng trường này tồn tại trong runtime
                prismaData.videoUrl = videoUrl;
              }
            } catch (schemaError) {
              console.error("Error checking schema:", schemaError);
            }
            */

            await prisma.testResultHistory.create({
              data: prismaData
            });

            console.log("Test result saved with browser:", browserOption);
          } catch (dbError) {
            console.error("Error saving test result history:", dbError);
            // Tiếp tục xử lý bình thường nếu không lưu được lịch sử
          }

          return {
            success: !stderr,
            output: stdout + (stderr ? `\nErrors:\n${stderr}` : ""),
            duration,
            steps: stepResults,
            screenshots,
            testResults: formattedTestResults,
            videoUrl
          };
        } catch (error: any) {
          // If test fails, Playwright will return a non-zero exit code
          // Update test case status to FAILED
          await prisma.testCase.update({
            where: {
              id: testCaseId,
            },
            data: {
              status: "failed",
              lastRun: new Date(),
            },
          });

          // Lưu kết quả test thất bại vào lịch sử
          try {
            console.log("Saving failed test result with browser:", browserOption);

            // Tìm video nếu có
            let videoUrl: string | undefined = undefined;
            if (fs.existsSync(testResultsDir)) {
              const findWebmFiles = (dir: string): string[] => {
                let results: string[] = [];
                const items = fs.readdirSync(dir);
                
                for (const item of items) {
                  const itemPath = path.join(dir, item);
                  const stat = fs.statSync(itemPath);
                  
                  if (stat.isDirectory()) {
                    results = results.concat(findWebmFiles(itemPath));
                  } else if (item.endsWith('.webm')) {
                    results.push(itemPath);
                  }
                }
                
                return results;
              };
              
              const webmFiles = findWebmFiles(testResultsDir);
              
              if (webmFiles.length > 0) {
                try {
                  const videoBuffer = await readFilePromise(webmFiles[0]);
                  // Tạo tên file duy nhất cho video
                  const videoFileName = `test-${testCaseId}-${Date.now()}.webm`;
                  const publicVideoPath = path.join(process.cwd(), 'public', 'videos', videoFileName);
                  
                  // Sao chép file video vào thư mục public/videos
                  await fs.promises.writeFile(publicVideoPath, videoBuffer);
                  
                  // Lưu đường dẫn tương đối thay vì base64
                  videoUrl = videoFileName;
                  console.log(`Video saved to public folder: ${videoFileName}`);
                } catch (error) {
                  console.error("Error processing video file:", error);
                }
              }
            }

            // Kiểm tra xem schema prisma có hỗ trợ videoUrl không
            const prismaData = {
              projectId,
              testCaseId,
              success: false,
              status: "failed",
              output: error.stdout + `\nErrors:\n${error.stderr}`,
              errorMessage: error.stderr || "Test execution failed",
              browser: browserOption,
              lastRunBy: userId,
              videoUrl: videoUrl || null // Thêm trực tiếp vì đã biết cột tồn tại
            };
            
            // Cột videoUrl đã tồn tại trong model TestResultHistory nên không cần kiểm tra nữa
            /*
            try {
              const testResultHistoryFields = await prisma.$queryRaw`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'TestResultHistory'
              `;
              
              const hasVideoUrlField = Array.isArray(testResultHistoryFields) && 
                testResultHistoryFields.some((field: any) => 
                  field.column_name === 'videoUrl' || field.COLUMN_NAME === 'videoUrl'
                );
              
              if (hasVideoUrlField && videoUrl) {
                // @ts-ignore - Chúng ta biết rằng trường này tồn tại trong runtime
                prismaData.videoUrl = videoUrl;
              }
            } catch (schemaError) {
              console.error("Error checking schema:", schemaError);
            }
            */

            await prisma.testResultHistory.create({
              data: prismaData
            });

            console.log("Failed test result saved with browser:", browserOption);
          } catch (dbError) {
            console.error("Error saving failed test result history:", dbError);
          }

          return {
            success: false,
            output: error.stdout + `\nErrors:\n${error.stderr}`,
            videoUrl: undefined
          };
        }
      } else {
        // Run all tests
        try {
          const startTime = Date.now();

          // Configure Playwright options - sử dụng browser từ tham số hoặc mặc định là chromium
          const browserOption = browser || "chromium";
          const headlessOption = headless ? "" : "--headed";
          const reporterOption = "--reporter=json";

          // Thêm tham số project để chỉ chạy trên một browser cụ thể thay vì tất cả
          const command = `npx playwright test ${reporterOption} --project=${browserOption} ${headlessOption}`;

          console.log(`Running all tests command: ${command}`);

          const { stdout, stderr } = await execPromise(command, {
        cwd: projectPath,
          });
          const endTime = Date.now();
          const duration = endTime - startTime;

          // Tìm video webm trong thư mục test-results
          let videoUrl: string | undefined = undefined;
          if (fs.existsSync(testResultsDir)) {
            const findWebmFiles = (dir: string): string[] => {
              let results: string[] = [];
              const items = fs.readdirSync(dir);
              
              for (const item of items) {
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory()) {
                  results = results.concat(findWebmFiles(itemPath));
                } else if (item.endsWith('.webm')) {
                  results.push(itemPath);
                }
              }
              
              return results;
            };
            
            const webmFiles = findWebmFiles(testResultsDir);
            
            if (webmFiles.length > 0) {
              // Sử dụng file đầu tiên nếu có nhiều file
              try {
                const videoBuffer = await readFilePromise(webmFiles[0]);
                // Tạo tên file duy nhất cho video
                const videoFileName = `all-tests-${Date.now()}.webm`;
                const publicVideoPath = path.join(process.cwd(), 'public', 'videos', videoFileName);
                
                // Sao chép file video vào thư mục public/videos
                await fs.promises.writeFile(publicVideoPath, videoBuffer);
                
                // Lưu đường dẫn tương đối thay vì base64
                videoUrl = videoFileName;
                console.log(`Video saved to public folder: ${videoFileName}`);
              } catch (error) {
                console.error("Error processing video file:", error);
              }
            }
          }

          // Parse test results if possible
          let testResults;
          try {
            if (stdout) {
              testResults = JSON.parse(stdout);
            }
          } catch (parseError) {
            console.error("Error parsing test results:", parseError);
          }

          // Extract useful information from testResults
          let formattedTestResults = null;
          if (testResults) {
            // Calculate statistics
            const stats = testResults.stats || {};

            // Check result status
            const hasErrors = !!stderr;
            const hasFailedTests =
              testResults.stats && testResults.stats.unexpected > 0;
            const success = !hasErrors && !hasFailedTests;

            // Format suites for easier display
            const suites = testResults.suites?.map((suite: any) => {
              // Loại bỏ các spec trùng lặp bằng cách dùng Map để theo dõi các title đã gặp
              const uniqueSpecsMap = new Map();

              suite.specs?.forEach((spec: any) => {
                // Chỉ thêm vào Map nếu title này chưa tồn tại hoặc spec hiện tại có lỗi
                if (!uniqueSpecsMap.has(spec.title) || !spec.ok) {
                  uniqueSpecsMap.set(spec.title, spec);
                }
              });

              // Chuyển đổi từ Map về mảng specs
              const uniqueSpecs = Array.from(uniqueSpecsMap.values()).map(
                (spec: any) => {
                  // Loại bỏ các test trùng lặp trong mỗi spec
                  const uniqueTestsMap = new Map();

                  spec.tests?.forEach((test: any) => {
                    if (
                      !uniqueTestsMap.has(test.title) ||
                      test.status !== "passed"
                    ) {
                      uniqueTestsMap.set(test.title, test);
                    }
                  });

                  return {
                    title: spec.title,
                    ok: spec.ok !== undefined ? spec.ok : !hasErrors,
                    tests: Array.from(uniqueTestsMap.values()).map(
                      (test: any) => {
                        return {
                          title: test.title,
                          status: test.status,
                          passed:
                            test.status === "passed" ||
                            test.status === "expected",
                          duration: test.duration,
                          error: test.error
                            ? {
                                message: test.error.message || test.error,
                                stack: test.error.stack,
                              }
                            : null,
                        };
                      }
                    ),
                  };
                }
              );

              return {
                title: suite.title,
                specs: uniqueSpecs,
              };
            });

            formattedTestResults = {
              stats,
              suites,
              success,
            };
          }

          // Update status of all test cases in the project
          if (!stderr) {
            await prisma.testCase.updateMany({
              where: {
                projectId: projectId,
              },
              data: {
                status: "passed",
                lastRun: new Date(),
              },
            });
          }

          // Lưu kết quả test chạy toàn bộ dự án vào lịch sử
          try {
            console.log("Saving all tests result with browser:", browserOption);

            // Kiểm tra xem schema prisma có hỗ trợ videoUrl không
            const prismaData = {
              projectId,
              success: !stderr,
              status: stderr ? "failed" : "passed",
              executionTime: duration,
              output: stdout + (stderr ? `\nErrors:\n${stderr}` : ""),
              errorMessage: stderr || null,
              resultData: formattedTestResults
                ? JSON.stringify(formattedTestResults)
                : null,
              browser: browserOption,
              lastRunBy: userId,
              videoUrl: videoUrl || null // Thêm trực tiếp vì đã biết cột tồn tại
            };
            
            // Cột videoUrl đã tồn tại trong model TestResultHistory nên không cần kiểm tra nữa
            /*
            try {
              const testResultHistoryFields = await prisma.$queryRaw`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'TestResultHistory'
              `;
              
              const hasVideoUrlField = Array.isArray(testResultHistoryFields) && 
                testResultHistoryFields.some((field: any) => 
                  field.column_name === 'videoUrl' || field.COLUMN_NAME === 'videoUrl'
                );
              
              if (hasVideoUrlField && videoUrl) {
                // @ts-ignore - Chúng ta biết rằng trường này tồn tại trong runtime
                prismaData.videoUrl = videoUrl;
              }
            } catch (schemaError) {
              console.error("Error checking schema:", schemaError);
            }
            */

            await prisma.testResultHistory.create({
              data: prismaData
            });

            console.log("All tests result saved with browser:", browserOption);
          } catch (dbError) {
            console.error("Error saving project test result history:", dbError);
          }

          return {
            success: !stderr,
            output: stdout + (stderr ? `\nErrors:\n${stderr}` : ""),
            duration,
            testResults: formattedTestResults,
            videoUrl,
          };
        } catch (error: any) {
          // Capture browserOption in this scope
          const browserOption = browser || "chromium";

          // Tìm video nếu có
          let videoUrl: string | undefined = undefined;
          if (fs.existsSync(testResultsDir)) {
            const findWebmFiles = (dir: string): string[] => {
              let results: string[] = [];
              const items = fs.readdirSync(dir);
              
              for (const item of items) {
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory()) {
                  results = results.concat(findWebmFiles(itemPath));
                } else if (item.endsWith('.webm')) {
                  results.push(itemPath);
                }
              }
              
              return results;
            };
            
            const webmFiles = findWebmFiles(testResultsDir);
            
            if (webmFiles.length > 0) {
              try {
                const videoBuffer = await readFilePromise(webmFiles[0]);
                // Tạo tên file duy nhất cho video
                const videoFileName = `all-tests-${Date.now()}.webm`;
                const publicVideoPath = path.join(process.cwd(), 'public', 'videos', videoFileName);
                
                // Sao chép file video vào thư mục public/videos
                await fs.promises.writeFile(publicVideoPath, videoBuffer);
                
                // Lưu đường dẫn tương đối thay vì base64
                videoUrl = videoFileName;
                console.log(`Video saved to public folder: ${videoFileName}`);
              } catch (videoError) {
                console.error("Error reading video file:", videoError);
              }
            }
          }

          // Lưu kết quả test thất bại vào lịch sử
          try {
            console.log(
              "Saving failed all tests result with browser:",
              browserOption
            );

            // Kiểm tra xem schema prisma có hỗ trợ videoUrl không
            const prismaData = {
              projectId,
              success: false,
              status: "failed",
              output: error.stdout + `\nErrors:\n${error.stderr}`,
              errorMessage: error.stderr || "Test execution failed",
              browser: browserOption,
              lastRunBy: userId,
              videoUrl: videoUrl || null // Thêm trực tiếp vì đã biết cột tồn tại
            };
            
            // Cột videoUrl đã tồn tại trong model TestResultHistory nên không cần kiểm tra nữa
            /*
            try {
              const testResultHistoryFields = await prisma.$queryRaw`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'TestResultHistory'
              `;
              
              const hasVideoUrlField = Array.isArray(testResultHistoryFields) && 
                testResultHistoryFields.some((field: any) => 
                  field.column_name === 'videoUrl' || field.COLUMN_NAME === 'videoUrl'
                );
              
              if (hasVideoUrlField && videoUrl) {
                // @ts-ignore - Chúng ta biết rằng trường này tồn tại trong runtime
                prismaData.videoUrl = videoUrl;
              }
            } catch (schemaError) {
              console.error("Error checking schema:", schemaError);
            }
            */

            await prisma.testResultHistory.create({
              data: prismaData
            });

            console.log(
              "Failed all tests result saved with browser:",
              browserOption
            );
          } catch (dbError) {
            console.error(
              "Error saving failed project test result history:",
              dbError
            );
          }

          return {
            success: false,
            output: error.stdout + `\nErrors:\n${error.stderr}`,
            videoUrl: undefined
          };
        }
      }
    } catch (error: any) {
      console.error("Error running tests:", error);
      throw new Error(`Unable to run tests: ${error.message}`);
    }
  }

  /**
   * Generates a new test file with basic structure
   */
  static generateTestFile(
    projectPath: string,
    testName: string,
    useTypescript: boolean = true
  ): string {
    const extension = useTypescript ? "ts" : "js";
    const testDir = path.join(projectPath, "tests");

    // Create tests directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Sanitize test name for file name
    const sanitizedTestName = testName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const testFilePath = path.join(
      testDir,
      `${sanitizedTestName}.spec.${extension}`
    );

    const testContent = useTypescript
      ? `import { test, expect } from '@playwright/test';

test.describe('${testName}', () => {
  test('should navigate to the page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.*/, { timeout: 5000 });
  });
});
`
      : `const { test, expect } = require('@playwright/test');

test.describe('${testName}', () => {
  test('should navigate to the page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.*/, { timeout: 5000 });
  });
});
`;

    fs.writeFileSync(testFilePath, testContent);
    console.log(`Created test file at ${testFilePath}`);

    return testFilePath;
  }

  /**
   * Installs Playwright browsers and dependencies
   */
  static async installBrowsers(
    projectPath: string
  ): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      let outputLog = "";
      const childProcess = spawn("npx", ["playwright", "install"], {
        cwd: projectPath,
        shell: true,
      });

      childProcess.stdout.on("data", (data) => {
        const output = data.toString();
        outputLog += output;
        console.log(`Playwright Install Output: ${output}`);
      });

      childProcess.stderr.on("data", (data) => {
        const error = data.toString();
        outputLog += error;
        console.error(`Playwright Install Error: ${error}`);
      });

      childProcess.on("close", (code) => {
        console.log(`Playwright install process exited with code ${code}`);
        resolve({
          success: code === 0,
          output: outputLog,
        });
      });
    });
  }

  /**
   * Helper function to update basic configuration settings
   */
  private static updateBasicConfig(configContent: string, config: PlaywrightConfig): string {
    let updatedConfig = configContent;

    const basicSettings = [
      { key: 'testDir', value: config.testDir, needQuotes: true },
      { key: 'fullyParallel', value: config.fullyParallel, needQuotes: false },
      { key: 'forbidOnly', value: config.forbidOnly, needQuotes: false },
      { key: 'retries', value: config.retries, needQuotes: false },
      { key: 'workers', value: config.workers, needQuotes: false },
      { key: 'timeout', value: config.timeout, needQuotes: false },
    ];

    basicSettings.forEach(({ key, value, needQuotes }) => {
      if (value !== undefined) {
        const formattedValue = needQuotes ? `'${value}'` : value;
        if (updatedConfig.includes(`${key}:`)) {
          updatedConfig = updatedConfig.replace(
            new RegExp(`${key}:.*?,`, 'g'),
            `${key}: ${formattedValue},`
          );
        } else {
          updatedConfig = updatedConfig.replace(
            /config = {/,
            `config = {\n  ${key}: ${formattedValue},`
          );
        }
      }
    });

    return updatedConfig;
  }

  /**
   * Helper function to update use section configuration
   */
  private static updateUseConfig(configContent: string, config: PlaywrightConfig): string {
    let updatedConfig = configContent;

    // Xử lý reporter configuration
    if (config.reporters && config.reporters.length > 0) {
      const reporterValue = `[
    ${config.reporters.map(reporter => `['${reporter}']`).join(',\n    ')}
  ]`;

      // Thay thế toàn bộ dòng reporter, bao gồm cả các dấu đóng ngoặc không đúng
      const reporterRegex = /reporter\s*:\s*\[[\s\S]*?\][^{]*?[,}]/;
      
      if (reporterRegex.test(updatedConfig)) {
        // Cắt file thành các phần để xử lý chính xác hơn
        const parts = updatedConfig.split(reporterRegex);
        if (parts.length >= 2) {
          // Tìm điểm kết thúc của phần reporter để thay thế chính xác
          const match = updatedConfig.match(reporterRegex);
          if (match) {
            const matchedText = match[0];
            // Kiểm tra xem phần cuối có dấu phẩy hay dấu đóng ngoặc
            const endChar = matchedText.trim().endsWith(',') ? ',' : ' }';
            // Thay thế với định dạng đúng
            updatedConfig = parts[0] + `reporter: ${reporterValue}${endChar}` + parts[1];
            console.log('Replaced entire reporter section');
          }
        }
        } else {
        // Thêm cấu hình reporter mới vào config
        updatedConfig = updatedConfig.replace(
          /config\s*=\s*{/,
          `config = {\n  reporter: ${reporterValue},`
        );
        console.log('Added new reporter configuration');
      }
    }

    // Xử lý viewport nếu có
      if (config.viewport) {
      const viewportValue = `{ width: ${config.viewport.width}, height: ${config.viewport.height} }`;
      this.updateValueInUseSection(updatedConfig, 'viewport', viewportValue, false);
    }

    // Xử lý baseURL và các cấu hình use khác
    const useSettings = [
      { key: 'baseURL', value: config.baseUrl, needQuotes: true },
      { key: 'colorScheme', value: config.colorScheme, needQuotes: true },
      { key: 'locale', value: config.locale, needQuotes: true },
      { key: 'timezoneId', value: config.timezoneId, needQuotes: true },
      { key: 'headless', value: config.headless, needQuotes: false },
      { key: 'screenshot', value: config.screenshot, needQuotes: true },
      { key: 'video', value: config.video, needQuotes: true },
      { key: 'trace', value: config.trace, needQuotes: true },
    ];

    // Kiểm tra xem có phần use trong config không
    if (!updatedConfig.includes('use: {')) {
      // Nếu không có phần use, thêm mới
      const useValues = useSettings
        .filter(({ value }) => value !== undefined)
        .map(({ key, value, needQuotes }) => {
          const formattedValue = needQuotes ? `'${value}'` : value;
          return `    ${key}: ${formattedValue}`;
        })
        .join(',\n');

      if (useValues) {
        updatedConfig = updatedConfig.replace(
          /config\s*=\s*{/,
          `config = {\n  use: {\n${useValues}\n  },`
        );
      }
        } else {
      // Nếu đã có phần use, cập nhật từng giá trị
      useSettings.forEach(({ key, value, needQuotes }) => {
        if (value !== undefined) {
          this.updateValueInUseSection(updatedConfig, key, value, needQuotes);
        }
      });
    }

    return updatedConfig;
  }

  /**
   * Helper function to update a specific value in the use section
   */
  private static updateValueInUseSection(
    config: string, 
    key: string, 
    value: any, 
    needQuotes: boolean
  ): string {
    const formattedValue = needQuotes ? `'${value}'` : value;
    
    // Tìm key trong phần use section
    const keyInUseRegex = new RegExp(`(use\\s*:\\s*{[\\s\\S]*?)(${key}\\s*:\\s*)[^,}]*(,|(?=\\s*}))`, 's');
    
    if (keyInUseRegex.test(config)) {
      // Cập nhật giá trị hiện có
      return config.replace(
        keyInUseRegex,
        `$1$2${formattedValue}$3`
      );
    } else if (config.includes('use: {')) {
      // Thêm key mới vào phần use
      return config.replace(
        /(use\s*:\s*{)/,
        `$1\n    ${key}: ${formattedValue},`
      );
    }
    
    return config;
  }

  /**
   * Helper function to update browser projects configuration
   */
  private static updateProjectsConfig(configContent: string, config: PlaywrightConfig): string {
    if (!config.browsers) return configContent;

    let updatedConfig = configContent;
    const activeBrowsers = Object.entries(config.browsers)
      .filter(([_, isActive]) => isActive)
      .map(([browser]) => browser);

    if (activeBrowsers.length > 0) {
      const projectsSection = `projects: [\n${activeBrowsers
        .map(browser => `    {
      name: '${browser}',
      use: { ...devices['Desktop ${browser.charAt(0).toUpperCase() + browser.slice(1)}'] },
    }`)
        .join(',\n')}\n  ]`;

      if (updatedConfig.includes('projects:')) {
        updatedConfig = updatedConfig.replace(
          /projects:[\s\S]*?\]/,
          projectsSection
          );
        } else {
        updatedConfig = updatedConfig.replace(
          /export default defineConfig\({/,
          `export default defineConfig({\n  ${projectsSection},`
        );
      }
    }

    return updatedConfig;
  }

  /**
   * Helper function to update expect options configuration
   */
  private static updateExpectConfig(configContent: string, config: PlaywrightConfig): string {
    if (!config.expect) return configContent;

    let updatedConfig = configContent;
        const expectValue = JSON.stringify(config.expect, null, 2);

    if (updatedConfig.includes('expect:')) {
      // Find and replace the entire expect section
      const expectRegex = /expect:\s*{[^}]*}/;
      updatedConfig = updatedConfig.replace(
        expectRegex,
        `expect: ${expectValue}`
      );
        } else {
      updatedConfig = updatedConfig.replace(
        /config = {/,
            `config = {\n  expect: ${expectValue},`
          );
    }

    return updatedConfig;
  }

  /**
   * Updates the Playwright configuration file with custom settings
   */
  static async updateProjectConfig(
    projectPath: string,
    config: PlaywrightConfig,
    useTypescript: boolean = true
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Updating project config with:', {
        reporters: config.reporters,
        reportFileNames: config.reportFileNames
      });
      
      const configFilePath = path.join(
        projectPath,
        useTypescript ? 'playwright.config.ts' : 'playwright.config.js'
      );

      if (!fs.existsSync(configFilePath)) {
        return {
          success: false,
          message: `Configuration file ${configFilePath} does not exist`,
        };
      }

      // Format reporter configuration
      if (config.reporters && config.reportFileNames) {
        config.reporter = config.reporters.map(reporter => {
          const fileName = config.reportFileNames?.[reporter];
          if (fileName) {
            let outputFile = fileName;
            // Add default extension if not provided
            if (reporter === 'html' && !fileName.includes('.html')) {
              outputFile = 'playwright-report';
            } else if (reporter === 'json' && !fileName.includes('.json')) {
              outputFile += '.json';
            } else if (reporter === 'junit' && !fileName.includes('.xml')) {
              outputFile += '.xml';
            }
            return [reporter, { outputFile }];
          }
          return reporter;
        });
      }

      // Read current configuration
      let configContent = fs.readFileSync(configFilePath, "utf8");

      // Update each section using helper functions
      configContent = this.updateBasicConfig(configContent, config);
      configContent = this.updateUseConfig(configContent, config);
      configContent = this.updateProjectsConfig(configContent, config);
      configContent = this.updateExpectConfig(configContent, config);

      // Save updated configuration
      fs.writeFileSync(configFilePath, configContent);

      // Update project-config.json if exists
      const projectConfigPath = path.join(projectPath, "project-config.json");
      if (fs.existsSync(projectConfigPath)) {
        try {
          const projectConfig = JSON.parse(
            fs.readFileSync(projectConfigPath, "utf8")
          );

          if (config.baseUrl) projectConfig.url = config.baseUrl;
          if (config.browsers) {
            const activeBrowser = Object.entries(config.browsers)
              .find(([_, isActive]) => isActive)?.[0];
            if (activeBrowser) projectConfig.browser = activeBrowser;
          }

          // Save reporter settings
          if (config.reporters) {
            projectConfig.reporters = config.reporters;
          }
          if (config.reportFileNames) {
            projectConfig.reportFileNames = config.reportFileNames;
          }

          fs.writeFileSync(
            projectConfigPath,
            JSON.stringify(projectConfig, null, 2)
          );
        } catch (error) {
          console.error("Error updating project-config.json:", error);
        }
      }

      return {
        success: true,
        message: "Updated Playwright configuration successfully",
      };
    } catch (error) {
      console.error("Error updating Playwright configuration:", error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Create Playwright test case from test steps
   */
  static async generateTestCaseFromSteps(
    projectPath: string,
    testCase: {
      id: string;
      name: string;
      description?: string;
      testSteps: Array<{
        id: string;
        action: string;
        data?: string;
        expected?: string;
        disabled: boolean;
        order: number;
      }>;
      tags?: string[];
    },
    baseUrl: string
  ): Promise<string> {
    try {
      // Convert test case name to valid file name
      const testFileName = `${toValidFileName(testCase.name)}.spec.ts`;

      // Ensure tests directory exists
      const testDir = path.join(projectPath, "tests");
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // Create full path to test file
      const testFilePath = path.join(testDir, testFileName);

      // Sort test steps by order
      const sortedSteps = [...testCase.testSteps].sort(
        (a, b) => a.order - b.order
      );

      // Check if any navigation step exists
      const hasNavigationStep = sortedSteps.some(
        (step) =>
          !step.disabled &&
          (step.action.toLowerCase().includes("navigate") ||
            step.action.toLowerCase().includes("goto") ||
            step.action.toLowerCase().includes("go to") ||
            step.action.toLowerCase().includes("open"))
      );

      // Process tags
      const tagsStr =
        testCase.tags && testCase.tags.length > 0
          ? `, {
  tag: ${
    testCase.tags.length === 1
      ? `'${testCase.tags[0]}'`
      : `[${testCase.tags.map((tag) => `'${tag}'`).join(", ")}]`
  }
}`
          : "";

      // Create test file content
      const testContent = `import { test, expect } from '@playwright/test';

test('${testCase.name}'${tagsStr}, async ({ page }) => {
  // Set default timeout
  page.setDefaultTimeout(30000);
  await page.goto('/');

});
`;

      // Create test file
      fs.writeFileSync(testFilePath, testContent);

      console.log(`Created test file at ${testFilePath}`);

      return testFilePath;
    } catch (error) {
      console.error("Error generating test case from steps:", error);
      throw error;
    }
  }

  /**
   * Fix test report configuration for a Playwright project
   */
  static async fixTestReportConfig(
    projectPath: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const configFileName = "playwright.config.ts";
      const configPath = path.join(projectPath, configFileName);

      // Check if the configuration file exists
      if (!fs.existsSync(configPath)) {
        return {
          success: false,
          message: `Configuration file ${configFileName} does not exist`,
        };
      }

      // Read current configuration file content
      let configContent = fs.readFileSync(configPath, "utf8");

      // Define the correct reporter configuration
      const correctReporterConfig = `[
  ['html'],
  ['json', { outputFile: 'test-results/test-results.json' }]
]`;

      // Update reporter configuration
      if (configContent.includes("reporter:")) {
        configContent = configContent.replace(
          /reporter:.*?,/g,
          `reporter: ${correctReporterConfig},`
        );
      } else {
        configContent = configContent.replace(
          /defineConfig\(\{/,
          `defineConfig({\n  reporter: ${correctReporterConfig},`
        );
      }

      // Save updated configuration file
      fs.writeFileSync(configPath, configContent);

      return {
        success: true,
        message: "Fixed test report configuration successfully",
      };
    } catch (error) {
      console.error("Error fixing test report configuration:", error);
      return {
        success: false,
        message: `Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Creates a playwright.config.ts file with exact format from template
   */
  static async createExactPlaywrightConfig(
    projectPath: string,
    config: PlaywrightConfig
  ): Promise<{ success: boolean; message: string }> {
    try {
      const configFilePath = path.join(projectPath, 'playwright.config.ts');
      
      // Format reporters array for the template
      let reporterConfig = '';
      if (config.reporters && config.reporters.length > 0) {
        if (config.reporters.length === 1) {
          const reporter = config.reporters[0];
          if (reporter === 'html') {
            reporterConfig = `'html'`;
          } else if (reporter === 'json') {
            reporterConfig = `[['json', { outputFile: 'test-results.json' }]]`;
          } else if (reporter === 'junit') {
            reporterConfig = `[['junit', { outputFile: 'junit-results.xml' }]]`;
          } else {
            reporterConfig = `'${reporter}'`;
          }
        } else {
          // If multiple reporters, use array format
          reporterConfig = `[
    ${config.reporters.map(reporter => {
      if (reporter === 'html') {
        return `['html', { outputDir: 'playwright-report' }]`;
      } else if (reporter === 'json') {
        return `['json', { outputFile: 'test-results.json' }]`;
      } else if (reporter === 'junit') {
        return `['junit', { outputFile: 'junit-results.xml' }]`;
      } else {
        return `['${reporter}']`;
      }
    }).join(',\n    ')}
  ]`;
        }
      } else {
        // Default to HTML reporter
        reporterConfig = `'html'`;
      }
      
      // Create the exact configuration file template
      const configContent = `import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: ${config.testDir ? `'${config.testDir}'` : "'tests'"},
  /* Run tests in files in parallel */
  fullyParallel: ${config.fullyParallel !== undefined ? config.fullyParallel : false},
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: ${config.forbidOnly !== undefined ? config.forbidOnly : false},
  /* Retry on CI only */
  retries: ${config.retries !== undefined ? config.retries : "process.env.CI ? 2 : 0"},
  /* Opt out of parallel tests on CI. */
  workers: ${config.workers !== undefined ? config.workers : 1},
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: ${reporterConfig},
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    ${config.video ? `video: '${config.video}',\n    ` : ""}${config.screenshot ? `screenshot: '${config.screenshot}',\n    ` : ""}${config.headless !== undefined ? `headless: ${config.headless},\n    ` : ""}${config.timezoneId ? `timezoneId: '${config.timezoneId}',\n    ` : ""}${config.locale ? `locale: '${config.locale}',\n    ` : ""}${config.colorScheme ? `colorScheme: '${config.colorScheme}',\n    ` : ""}${config.viewport ? `viewport: { width: ${config.viewport.width}, height: ${config.viewport.height} },\n    ` : ""}${config.baseUrl ? `baseURL: '${config.baseUrl}',\n\n    ` : ""}/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    ${config.trace ? `trace: '${config.trace}',` : "trace: 'on-first-retry',"}
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});`;
      
      // Write the configuration file
      fs.writeFileSync(configFilePath, configContent);
      console.log(`Created exact playwright.config.ts at ${configFilePath}`);
      
      return {
        success: true,
        message: "Created playwright configuration successfully with exact template",
      };
    } catch (error) {
      console.error("Error creating exact Playwright configuration:", error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}