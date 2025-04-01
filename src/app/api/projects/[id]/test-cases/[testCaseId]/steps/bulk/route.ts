import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { testCaseId } = resolvedParams;

    // Check if test case exists
    const testCase = await prisma.testCase.findUnique({
      where: {
        id: testCaseId,
      },
    });

    if (!testCase) {
      return NextResponse.json(
        { error: "Test case does not exist" },
        { status: 404 }
      );
    }

    // Đọc dữ liệu từ request
    const { steps } = await request.json();

    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: "At least one test step is required" },
        { status: 400 }
      );
    }

    // Delete existing steps if any
    await prisma.testStep.deleteMany({
      where: {
        testCaseId: testCaseId,
      },
    });

    // Thêm các bước mới
    const createdSteps = await Promise.all(
      steps.map(async (step) => {
        return prisma.testStep.create({
          data: {
            testCaseId,
            action: step.action,
            data: step.data || null,
            expected: step.expected || null,
            disabled: step.disabled || false,
            order: step.order,
          },
        });
      })
    );

    // Update test case status
    await prisma.testCase.update({
      where: {
        id: testCaseId,
      },
      data: {
        updatedAt: new Date(),
        status: "draft",
      },
    });

    return NextResponse.json({
      message: "Test steps saved successfully",
      count: createdSteps.length,
    });
  } catch (error) {
    console.error("Error saving test steps:", error);
    return NextResponse.json(
      { error: "Failed to save test steps" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { testCaseId } = resolvedParams;

    // Check if test case exists
    const testCase = await prisma.testCase.findUnique({
      where: {
        id: testCaseId,
      },
    });

    if (!testCase) {
      return NextResponse.json(
        { error: "Test case does not exist" },
        { status: 404 }
      );
    }

    // Get reordered steps from request
    const reorderedSteps = await request.json();

    if (!Array.isArray(reorderedSteps) || reorderedSteps.length === 0) {
      return NextResponse.json(
        { error: "At least one test step is required" },
        { status: 400 }
      );
    }

    // Update each test step with its new order
    const updatePromises = reorderedSteps.map((step) => {
      return prisma.testStep.update({
        where: { id: step.id },
        data: { order: step.order },
      });
    });

    await Promise.all(updatePromises);

    // Update test case status and lastUpdated
    await prisma.testCase.update({
      where: {
        id: testCaseId,
      },
      data: {
        updatedAt: new Date(),
        status: "draft",
      },
    });

    return NextResponse.json({
      message: "Test steps reordered successfully",
      count: reorderedSteps.length,
    });
  } catch (error) {
    console.error("Error reordering test steps:", error);
    return NextResponse.json(
      { error: "Failed to reorder test steps" },
      { status: 500 }
    );
  }
}
