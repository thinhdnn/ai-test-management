import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Lấy chi tiết của một kết quả test cụ thể
 *
 * GET /api/projects/[id]/test-history/[resultId]
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const resultId = resolvedParams.resultId;

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
              tags: true,
            },
          },
        },
      });

      if (!testResult) {
        return NextResponse.json(
          { error: "Test result not found" },
          { status: 404 }
        );
      }

      // Parse resultData nếu có
      let parsedResultData = null;
      try {
        if (testResult.resultData) {
          parsedResultData = JSON.parse(testResult.resultData);
        }
      } catch (error) {
        console.error("Error parsing resultData:", error);
      }

      return NextResponse.json({
        id: testResult.id,
        projectId: testResult.projectId,
        testCaseId: testResult.testCaseId,
        testCaseName: testResult.testCase?.name || "All Tests",
        testCaseDescription: testResult.testCase?.description || "",
        testCaseTags: testResult.testCase?.tags || null,
        success: testResult.success,
        status: testResult.status,
        executionTime: testResult.executionTime,
        output: testResult.output,
        errorMessage: testResult.errorMessage,
        browser: testResult.browser,
        createdAt: testResult.createdAt,
        resultData: parsedResultData,
        videoUrl: (testResult as any).videoUrl || null,
      });
    } catch (dbError) {
      // Xử lý trường hợp table TestResultHistory chưa tồn tại
      console.error("Database error:", dbError);
      return NextResponse.json(
        {
          error: "Test result not available",
          message:
            "TestResultHistory table might not exist yet. Please run migration first.",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error fetching test result details:", error);
    return NextResponse.json(
      { error: "Unable to fetch test result details" },
      { status: 500 }
    );
  }
}
