import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const { id: projectId, testCaseId } = await params;
    const { steps } = await request.json();

    // Validate input
    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: "Invalid steps data" },
        { status: 400 }
      );
    }

    // Check if test case exists and belongs to project
    const testCase = await prisma.testCase.findUnique({
      where: {
        id: testCaseId,
        projectId,
      },
    });

    if (!testCase) {
      return NextResponse.json(
        { error: "Test case not found" },
        { status: 404 }
      );
    }

    // Update steps order in transaction
    const updates = steps.map((step) => {
      return prisma.testStep.update({
        where: { id: step.id },
        data: { order: step.order },
      });
    });

    await prisma.$transaction(updates);

    return NextResponse.json({
      success: true,
      message: "Test steps reordered successfully",
    });
  } catch (error) {
    console.error("Error reordering test steps:", error);
    return NextResponse.json(
      {
        error: "Failed to reorder test steps",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
