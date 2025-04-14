import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai-provider";
import { getCurrentUserId, AuditFields } from "@/lib/auth-utils";
import { createNewVersion } from "@/lib/version-utils";

// Helper function to increment version
function incrementVersion(version: string): string {
  const parts = version.split('.');
  if (parts.length !== 3) {
    return '1.0.1'; // Default if format is incorrect
  }
  
  const major = parseInt(parts[0]);
  const minor = parseInt(parts[1]);
  let patch = parseInt(parts[2]);
  
  patch += 1;
  
  return `${major}.${minor}.${patch}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    const testCaseId = resolvedParams.testCaseId;

    // Verify test case exists and belongs to the project
    const testCase = await prisma.testCase.findUnique({
      where: {
        id: testCaseId,
        projectId: projectId,
      },
    });

    if (!testCase) {
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    // Get all test steps for the test case, ordered by their order field
    const testSteps = await prisma.testStep.findMany({
      where: {
        testCaseId: testCaseId,
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(testSteps);
  } catch (error) {
    console.error("Error fetching test steps:", error);
    return NextResponse.json(
      { error: "Failed to fetch test steps" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    // Await params before destructuring
    const resolvedParams = await params;
    const { id, testCaseId } = resolvedParams;

    if (!id || !testCaseId) {
      return NextResponse.json(
        { message: "Missing required parameters" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, data, expected, order, playwrightCode, fixtureId } = body;

    // Nếu có mã Playwright, phân tích để tạo bước test
    if (playwrightCode) {
      try {
        // Lấy provider AI hiện tại được cấu hình
        const aiProvider = await getAIProvider();

        // Phân tích mã Playwright
        const parsedSteps = await aiProvider.analyzePlaywrightCode(
          playwrightCode
        );

        if (!Array.isArray(parsedSteps) || parsedSteps.length === 0) {
          return NextResponse.json(
            { message: "Could not parse Playwright code" },
            { status: 400 }
          );
        }

        // Tìm bước test có order cao nhất hiện tại
        const highestOrderStep = await prisma.testStep.findFirst({
          where: { testCaseId },
          orderBy: { order: "desc" },
        });

        let startOrder = highestOrderStep ? highestOrderStep.order + 1 : 1;

        // Tạo các bước test từ mã đã phân tích
        const createdSteps = [];
        for (const step of parsedSteps) {
          const newStep = await prisma.testStep.create({
            data: {
              testCaseId,
              action: step.action || "",
              data: step.data || "",
              expected: step.expected || "",
              order: startOrder++,
              fixtureId: fixtureId || null,
            },
          });
          createdSteps.push(newStep);
        }

        return NextResponse.json({ steps: createdSteps });
      } catch (error) {
        console.error("Error parsing Playwright code:", error);
        return NextResponse.json(
          { message: "Error parsing Playwright code", error },
          { status: 500 }
        );
      }
    }

    // Nếu không có mã Playwright, tạo bước test từ dữ liệu được cung cấp
    try {
      // Nếu cung cấp action nhưng không có mã Playwright, tạo mã từ action
      let finalPlaywrightCode = "";

      if (action && !playwrightCode) {
        try {
          // Lấy provider AI hiện tại được cấu hình
          const aiProvider = await getAIProvider();

          // Tạo mã Playwright từ bước test
          const generatedStep = await aiProvider.generatePlaywrightCodeFromStep(
            action,
            data,
            expected
          ) as any;

          // Use AI-enhanced values if available
          const enhancedAction =
            generatedStep.action && generatedStep.action !== "N/A"
              ? generatedStep.action
              : action;

          const enhancedExpected = generatedStep.expected
            ? generatedStep.expected
            : expected;

          // Create the step with enhanced values
          const step = await prisma.testStep.create({
            data: {
              testCaseId,
              order: order || 1,
              action: enhancedAction || action,
              data,
              expected: enhancedExpected || expected,
              playwrightCode: generatedStep.playwrightCode || null,
              fixtureId: fixtureId || null,
            },
          });

          // Cập nhật trạng thái test case
          await prisma.testCase.update({
            where: { id: testCaseId },
            data: { status: "draft" },
          });
          
          // Tăng phiên bản và tạo phiên bản mới sau khi tạo bước test
          try {
            // Lấy test case để có thông tin phiên bản hiện tại
            const testCase = await prisma.testCase.findUnique({
              where: { id: testCaseId }
            });
            
            if (testCase) {
              // Tính phiên bản mới
              const currentVersion = testCase.version || "1.0.0";
              const nextVersion = incrementVersion(currentVersion);
              
              // Cập nhật phiên bản trong test case
              await prisma.testCase.update({
                where: { id: testCaseId },
                data: { version: nextVersion }
              });
              
              // Tạo phiên bản với số phiên bản mới
              const userId = getCurrentUserId(request);
              await createNewVersion(testCaseId, userId ?? undefined, nextVersion, false);
            }
          } catch (error) {
            console.error("Error creating version after adding step:", error);
            // Continue even if version creation fails
          }

          return NextResponse.json({ step });
        } catch (error) {
          console.error("Error generating Playwright code from step:", error);
          finalPlaywrightCode = `// TODO: Implement "${action}" step`;
        }
      }

      // Tạo bước test mới
      const step = await prisma.testStep.create({
        data: {
          testCaseId,
          action: action || "",
          data: data || "",
          expected: expected || "",
          order: order || 1,
          playwrightCode: finalPlaywrightCode,
          fixtureId: fixtureId || null,
        },
      });

      // Cập nhật trạng thái test case
      await prisma.testCase.update({
        where: { id: testCaseId },
        data: { status: "draft" },
      });
      
      // Tăng phiên bản và tạo phiên bản mới sau khi tạo bước test
      try {
        // Lấy test case để có thông tin phiên bản hiện tại
        const testCase = await prisma.testCase.findUnique({
          where: { id: testCaseId }
        });
        
        if (testCase) {
          // Tính phiên bản mới
          const currentVersion = testCase.version || "1.0.0";
          const nextVersion = incrementVersion(currentVersion);
          
          // Cập nhật phiên bản trong test case
          await prisma.testCase.update({
            where: { id: testCaseId },
            data: { version: nextVersion }
          });
          
          // Tạo phiên bản với số phiên bản mới
          const userId = getCurrentUserId(request);
          await createNewVersion(testCaseId, userId ?? undefined, nextVersion, false);
        }
      } catch (error) {
        console.error("Error creating version after adding step:", error);
        // Continue even if version creation fails
      }

      return NextResponse.json({ step });
    } catch (error) {
      console.error("Error creating step:", error);
      return NextResponse.json(
        { message: "Error creating step", error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { message: "Internal server error", error },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string; stepId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id, testCaseId, stepId } = resolvedParams;

    if (!id || !testCaseId || !stepId) {
      return NextResponse.json(
        { message: "Missing required parameters" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, data, expected, order, disabled, fixtureId } = body;
    const userId = getCurrentUserId(request);

    // Update step
    const updatedStep = await prisma.testStep.update({
      where: { id: stepId },
      data: {
        action,
        data,
        expected,
        order,
        disabled,
        fixtureId: fixtureId || null,
      },
    });
    
    // Tăng phiên bản và tạo phiên bản mới sau khi cập nhật bước test
    try {
      // Lấy test case để có thông tin phiên bản hiện tại
      const testCase = await prisma.testCase.findUnique({
        where: { id: testCaseId }
      });
      
      if (testCase) {
        // Tính phiên bản mới
        const currentVersion = testCase.version || "1.0.0";
        const nextVersion = incrementVersion(currentVersion);
        
        // Cập nhật phiên bản trong test case
        await prisma.testCase.update({
          where: { id: testCaseId },
          data: { version: nextVersion }
        });
        
        // Tạo phiên bản với số phiên bản mới
        await createNewVersion(testCaseId, userId ?? undefined, nextVersion, false);
      }
    } catch (error) {
      console.error("Error creating version after updating step:", error);
      // Continue even if version creation fails
    }
    
    return NextResponse.json({ step: updatedStep });
  } catch (error) {
    console.error("Error updating step:", error);
    return NextResponse.json(
      { message: "Error updating step", error },
      { status: 500 }
    );
  }
}
