import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const testCaseId = searchParams.get("testCaseId");
    const actionType = searchParams.get("actionType");

    const where: Record<string, unknown> = {
      testCase: {
        projectId,
      },
    };

    // Nếu có filter theo test case
    if (testCaseId) {
      where.testCaseId = testCaseId;
    }

    // Nếu có filter theo action type
    if (actionType) {
      where.action = {
        contains: actionType,
        mode: "insensitive",
      };
    }

    // Nếu có query tìm kiếm
    if (query) {
      where.OR = [
        { action: { contains: query, mode: "insensitive" } },
        { data: { contains: query, mode: "insensitive" } },
        { expected: { contains: query, mode: "insensitive" } },
      ];
    }

    const testSteps = await prisma.testStep.findMany({
      where,
      include: {
        testCase: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json(testSteps);
  } catch (error) {
    console.error("Error searching test steps:", error);
    return NextResponse.json(
      { error: "Failed to search test steps" },
      { status: 500 }
    );
  }
}
