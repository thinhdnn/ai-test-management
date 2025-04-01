import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Get test result history for a project
 *
 * GET /api/projects/[id]/test-history
 * Params: testCaseId (optional) - if provided, will only get history for a specific test case
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get("testCaseId");
    const limit = Number(searchParams.get("limit") || "20");
    const page = Number(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    // Check if the project exists
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

    try {
      // Basic condition
      const where = {
        projectId: projectId,
        ...(testCaseId ? { testCaseId } : {}),
      };

      // Get total records for pagination
      const totalRecords = await prisma.testResultHistory.count({
        where,
      });

      // Get test result history
      const testHistory = await prisma.testResultHistory.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
        include: {
          testCase: {
            select: {
              name: true,
              description: true,
            },
          },
        },
      });

      // Get user information for all test runs
      const userIds = testHistory
        .filter((history) => history.lastRunBy)
        .map((history) => history.lastRunBy as string);

      const users =
        userIds.length > 0
          ? await prisma.user.findMany({
              where: {
                id: {
                  in: userIds,
                },
              },
              select: {
                id: true,
                username: true,
              },
            })
          : [];

      // Create a map of user IDs to usernames
      const userMap = new Map();
      users.forEach((user) => {
        userMap.set(user.id, user.username);
      });

      // Process data before returning
      const formattedTestHistory = testHistory.map((record) => {
        // Parse resultData if available
        let parsedResultData = null;
        try {
          if (record.resultData) {
            parsedResultData = JSON.parse(record.resultData);
          }
        } catch (error) {
          console.error("Error parsing resultData:", error);
        }

        // Theo dõi dữ liệu browser
        console.log(`Processing record ${record.id}:`, {
          recordHasBrowser: "browser" in record,
          recordBrowser: "browser" in record ? (record as any).browser : null,
          parsedBrowser:
            parsedResultData?.suites?.[0]?.specs?.[0]?.tests?.[0]?.projectName,
          projectBrowser: project.browser,
        });

        return {
          id: record.id,
          projectId: record.projectId,
          testCaseId: record.testCaseId,
          testCaseName: record.testCase?.name || "All Tests",
          success: record.success,
          status: record.status,
          executionTime: record.executionTime,
          createdAt: record.createdAt,
          browser:
            // Priority: get from record (stored in DB)
            "browser" in record
              ? (record as any).browser
              : // If not, try to get from test report
                parsedResultData?.suites?.[0]?.specs?.[0]?.tests?.[0]
                  ?.projectName ||
                // Finally, use browser from project or default to "chromium"
                project.browser ||
                "chromium",
          lastRunBy: record.lastRunBy,
          lastRunBy_username: record.lastRunBy
            ? userMap.get(record.lastRunBy) || null
            : null,
          resultData: parsedResultData,
          // Don't return output and errorMessage as they can be very large
          hasOutput: !!record.output,
          hasError: !!record.errorMessage,
          videoUrl: (record as any).videoUrl || null,
        };
      });

      return NextResponse.json({
        data: formattedTestHistory,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          limit,
        },
      });
    } catch (dbError) {
      // Handle case where TestResultHistory table doesn't exist yet
      console.error("Database error:", dbError);

      // Return empty data if there's a database error
      return NextResponse.json({
        data: [],
        pagination: {
          totalRecords: 0,
          totalPages: 1,
          currentPage: 1,
          limit,
        },
        message:
          "TestResultHistory table might not exist yet. Please run migration first.",
      });
    }
  } catch (error) {
    console.error("Error fetching test history:", error);
    return NextResponse.json(
      { error: "Unable to fetch test history" },
      { status: 500 }
    );
  }
}

/**
 * API to get details of a specific test result
 *
 * GET /api/projects/[id]/test-history/[resultId]
 */
export async function getTestResultDetails(
  resultId: string,
  projectId: string
) {
  try {
    const testResult = await prisma.testResultHistory.findFirst({
      where: {
        id: resultId,
        projectId: projectId,
      },
      include: {
        testCase: {
          select: {
            name: true,
            description: true,
          },
        },
      },
    });

    if (!testResult) {
      return { error: "Test result not found", status: 404 };
    }

    // Get user information if lastRunBy exists
    let runByUsername = null;
    if (testResult.lastRunBy) {
      const user = await prisma.user.findUnique({
        where: {
          id: testResult.lastRunBy,
        },
        select: {
          username: true,
        },
      });
      runByUsername = user?.username || null;
    }

    // Parse resultData if available
    let parsedResultData = null;
    try {
      if (testResult.resultData) {
        parsedResultData = JSON.parse(testResult.resultData);
      }
    } catch (error) {
      console.error("Error parsing resultData:", error);
    }

    return {
      id: testResult.id,
      projectId: testResult.projectId,
      testCaseId: testResult.testCaseId,
      testCaseName: testResult.testCase?.name || "All Tests",
      success: testResult.success,
      status: testResult.status,
      executionTime: testResult.executionTime,
      output: testResult.output,
      errorMessage: testResult.errorMessage,
      createdAt: testResult.createdAt,
      lastRunBy: testResult.lastRunBy,
      lastRunBy_username: runByUsername,
      resultData: parsedResultData,
      browser:
        "browser" in testResult
          ? (testResult as any).browser
          : parsedResultData?.suites?.[0]?.specs?.[0]?.tests?.[0]
              ?.projectName || null,
      videoUrl: (testResult as any).videoUrl || null,
    };
  } catch (error) {
    console.error("Error fetching test result details:", error);
    return { error: "Unable to fetch test result details", status: 500 };
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const { testCaseId, browser, headless = true } = await request.json();

    console.log("API received browser:", browser); // Log for debugging

    // Implementation for test history POST would go here

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in test history POST:", error);
    return NextResponse.json(
      { error: "Error processing request" },
      { status: 500 }
    );
  }
}
