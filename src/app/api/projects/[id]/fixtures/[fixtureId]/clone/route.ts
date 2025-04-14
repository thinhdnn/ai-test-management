import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId, AuditFields } from "@/lib/auth-utils";
import { v4 as uuidv4 } from "uuid";
import { TestStep } from "@prisma/client";

/**
 * API Route để clone một fixture và tất cả các steps của nó
 * 
 * POST /api/projects/[id]/fixtures/[fixtureId]/clone
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fixtureId: string }> }
) {
  try {
    const { id: projectId, fixtureId } = await params;
    const userId = getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 1. Lấy thông tin về fixture hiện tại
    const existingFixture = await prisma.fixture.findUnique({
      where: {
        id: fixtureId,
      }
    });

    if (!existingFixture) {
      return NextResponse.json(
        { error: "Fixture not found" },
        { status: 404 }
      );
    }

    // Lấy tất cả các steps liên quan đến fixture này
    const fixtureSteps = await prisma.testStep.findMany({
      where: {
        fixtureId: fixtureId
      },
      orderBy: {
        order: "asc",
      },
    });

    // 2. Tạo fixture mới với thông tin từ fixture cũ
    const newFixture = await prisma.fixture.create({
      data: {
        id: uuidv4(), // Generate a new UUID
        name: `${existingFixture.name} (Clone)`,
        description: existingFixture.description || "",
        type: existingFixture.type || "data",
        projectId: projectId,
        content: existingFixture.content,
        fixtureFilePath: existingFixture.fixtureFilePath,
        ...AuditFields.forCreate(userId),
      },
    });

    // 3. Clone tất cả các steps từ fixture cũ sang fixture mới
    if (fixtureSteps.length > 0) {
      const stepsToCreate = fixtureSteps.map((step: TestStep) => ({
        id: uuidv4(), // Generate a new UUID for each step
        order: step.order,
        action: step.action,
        data: step.data,
        expected: step.expected,
        playwrightCode: step.playwrightCode,
        disabled: step.disabled,
        fixtureId: newFixture.id, // Assign to the new fixture
        ...AuditFields.forCreate(userId),
      }));

      await prisma.testStep.createMany({
        data: stepsToCreate,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Fixture cloned successfully",
      fixture: newFixture,
    });
  } catch (error) {
    console.error("Error cloning fixture:", error);
    return NextResponse.json(
      { error: "Failed to clone fixture" },
      { status: 500 }
    );
  }
} 