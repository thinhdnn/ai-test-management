import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; testCaseId: string }> }
) {
  try {
    const { id: projectId, testCaseId } = await params;
    const { sourceStepId } = await request.json();

    // Kiểm tra xem test case có tồn tại và thuộc về project không
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

    // Tìm source step
    const sourceStep = await prisma.testStep.findUnique({
      where: { id: sourceStepId },
    });

    if (!sourceStep) {
      return NextResponse.json(
        { error: "Source test step not found" },
        { status: 404 }
      );
    }

    // Tìm order cao nhất hiện có
    const maxOrderStep = await prisma.testStep.findFirst({
      where: { testCaseId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const newOrder = maxOrderStep ? maxOrderStep.order + 1 : 1;

    // Tạo step mới
    const newStep = await prisma.testStep.create({
      data: {
        action: sourceStep.action,
        data: sourceStep.data,
        expected: sourceStep.expected,
        selector: sourceStep.selector,
        playwrightCode: sourceStep.playwrightCode,
        disabled: false,
        order: newOrder,
        testCase: { connect: { id: testCaseId } },
      },
    });

    return NextResponse.json(newStep);
  } catch (error) {
    console.error("Error cloning test step:", error);
    return NextResponse.json(
      { error: "Failed to clone test step" },
      { status: 500 }
    );
  }
}
