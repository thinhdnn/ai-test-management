import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai-provider";
import {
  AnalyzePlaywrightRequest,
  AnalyzePlaywrightResponse,
  GeminiTestStepResponse,
} from "@/types";
import { prisma } from "@/lib/db";

// Hàm helper để thêm CORS headers vào response
function corsResponse(body: any, status: number = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get("testCaseId");
    const fixtureId = searchParams.get("fixtureId");

    // Log request parameters
    console.log(
      "[API] Request parameters:",
      { testCaseId, fixtureId }
    );

    // Log request body
    const requestBody = await request.json();
    console.log(
      "[API] POST Request body:",
      JSON.stringify(requestBody, null, 2)
    );

    if (!testCaseId && !fixtureId) {
      return corsResponse({ error: "Missing testCaseId or fixtureId parameter" }, 400);
    }

    const { action, playwrightCode } = requestBody;

    // Validate action and playwrightCode
    if (!action || action !== "analyze" || !playwrightCode) {
      return corsResponse(
        {
          error:
            "Invalid request. Requires action='analyze' and playwrightCode",
        },
        400
      );
    }

    // Prioritize fixtureId if it's provided, otherwise use testCaseId
    let entityType = null;
    let entityId = null;
    
    if (fixtureId) {
      console.log("[API] Looking up fixture with ID:", fixtureId);
      try {
        // Just log what we know about the fixture model
        console.log("[API] Using prisma.fixture model to find the fixture");
      } catch (err) {
        console.error("[API] Error inspecting model:", err);
      }
      
      const fixture = await prisma.fixture.findUnique({
        where: { id: fixtureId },
      });

      if (!fixture) {
        console.log("[API] Fixture not found with ID:", fixtureId);
        
        // Try to find existing fixtures to suggest
        try {
          const fixtures = await prisma.fixture.findMany({ take: 1 });
          if (fixtures.length > 0) {
            console.log("[API] Suggesting alternative fixture ID:", fixtures[0].id);
            return corsResponse({ 
              error: "Fixture not found", 
              suggestion: `Try using fixture ID: ${fixtures[0].id}` 
            }, 404);
          }
        } catch (err) {
          console.error("[API] Error searching for fixtures:", err);
        }
        
        return corsResponse({ error: "Fixture not found" }, 404);
      }
      
      console.log("[API] Found fixture:", fixture.name);
      entityType = "fixture";
      entityId = fixtureId;
    } else if (testCaseId) {
      console.log("[API] Looking up test case with ID:", testCaseId);
      const testCase = await prisma.testCase.findUnique({
        where: { id: testCaseId },
      });

      if (!testCase) {
        console.log("[API] Test case not found with ID:", testCaseId);
        return corsResponse({ error: "Test case not found" }, 404);
      }
      
      console.log("[API] Found test case:", testCase.name);
      entityType = "testCase";
      entityId = testCaseId;
    }

    const aiProvider = await getAIProvider();

    // Phân tích và tạo test step trực tiếp từ AI provider
    const testStepData = await aiProvider.analyzeAndGenerateTestStep(
      playwrightCode
    );

    console.log("[API] TestStepData:", JSON.stringify(testStepData, null, 2));

    // Get next order for the test step based on what entity we're using
    let lastStep;
    if (entityType === "testCase") {
      lastStep = await prisma.testStep.findFirst({
        where: { testCaseId: entityId },
        orderBy: { order: "desc" },
      });
    } else if (entityType === "fixture") {
      lastStep = await prisma.testStep.findFirst({
        where: { fixtureId: entityId },
        orderBy: { order: "desc" },
      });
    }
    const nextOrder = lastStep ? lastStep.order + 1 : 1;

    // Extract step info from testStepData - sử dụng trực tiếp thông tin từ AI
    let stepInfo = {
      action: "Analyzed action",
      selector: "",
      data: "",
      expected: "",
      playwrightCode: "",
    };

    // Try to extract better step info from testStepData
    if (testStepData && typeof testStepData === "object") {
      if (testStepData.action) stepInfo.action = testStepData.action;
      if (testStepData.selector) stepInfo.selector = testStepData.selector;
      if (testStepData.data) stepInfo.data = testStepData.data;
      if (testStepData.expected) stepInfo.expected = testStepData.expected;
      // Sử dụng command đã được tạo nếu có
      if (testStepData.command) stepInfo.playwrightCode = testStepData.command;
    }

    // Nếu không có command từ AI, sử dụng input code
    if (!stepInfo.playwrightCode) {
      stepInfo.playwrightCode = playwrightCode;
    }

    // Create a new test step with the appropriate ID
    const newTestStep = await prisma.testStep.create({
      data: {
        ...(entityType === "testCase" ? { testCaseId: entityId } : {}),
        ...(entityType === "fixture" ? { fixtureId: entityId } : {}),
        action: stepInfo.action,
        selector: stepInfo.selector,
        data: stepInfo.data,
        expected: stepInfo.expected,
        playwrightCode: stepInfo.playwrightCode,
        order: nextOrder,
        disabled: false,
      },
    });

    // Return response with the created test step and analysis
    return corsResponse({
      success: true,
      testStep: newTestStep,
      analysis: testStepData, // Trả về kết quả phân tích
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return corsResponse(
      { error: "Internal server error", details: String(error) },
      500
    );
  }
}

// Add OPTIONS method for CORS preflight
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
