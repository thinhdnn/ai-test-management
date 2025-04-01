import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; testCaseId: string } }
) {
  try {
    const { stepIds } = await request.json();

    if (!Array.isArray(stepIds) || stepIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request body. Expected stepIds array." },
        { status: 400 }
      );
    }

    // Xóa các steps
    await prisma.testStep.deleteMany({
      where: {
        id: { in: stepIds },
        testCaseId: params.testCaseId,
      },
    });

    // Lấy và sắp xếp lại thứ tự của các steps còn lại
    const remainingSteps = await prisma.testStep.findMany({
      where: {
        testCaseId: params.testCaseId,
      },
      orderBy: {
        order: "asc",
      },
    });

    // Cập nhật thứ tự
    for (let i = 0; i < remainingSteps.length; i++) {
      await prisma.testStep.update({
        where: { id: remainingSteps[i].id },
        data: { order: i + 1 },
      });
    }

    return NextResponse.json(
      { message: `${stepIds.length} steps deleted successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting steps:", error);
    return NextResponse.json(
      { error: "Failed to delete steps" },
      { status: 500 }
    );
  }
}
