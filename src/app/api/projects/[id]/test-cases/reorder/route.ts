import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { testCases } = await request.json();

    // Validate input
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return NextResponse.json(
        { error: "Invalid test cases data" },
        { status: 400 }
      );
    }

    // Update each test case with its new order
    const updates = testCases.map((testCase) => {
      return prisma.testCase.update({
        where: { 
          id: testCase.id,
          projectId: projectId 
        },
        data: { order: testCase.order },
      });
    });

    await prisma.$transaction(updates);

    return NextResponse.json({
      success: true,
      message: "Test cases reordered successfully",
    });
  } catch (error) {
    console.error("Error reordering test cases:", error);
    return NextResponse.json(
      {
        error: "Failed to reorder test cases",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 