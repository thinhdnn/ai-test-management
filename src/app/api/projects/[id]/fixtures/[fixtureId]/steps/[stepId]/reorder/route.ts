import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserId, AuditFields } from "@/lib/auth-utils";

// Reorder validation schema
const reorderSchema = z.object({
  order: z.number().min(0),
});

// PUT /api/projects/[id]/fixtures/[fixtureId]/steps/[stepId]/reorder - Update step order
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string; stepId: string } }
) {
  try {
    const { fixtureId, stepId } = await Promise.resolve(params);
    const userId = getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get the body data
    const body = await request.json();
    const validatedData = reorderSchema.parse(body);

    // Check if step exists
    const step = await prisma.testStep.findUnique({
      where: {
        id: stepId,
      },
    });

    if (!step) {
      return NextResponse.json(
        { error: "Step not found" },
        { status: 404 }
      );
    }

    // Update just the order
    const updatedStep = await prisma.testStep.update({
      where: {
        id: stepId,
      },
      data: {
        order: validatedData.order,
        ...AuditFields.forUpdate(userId),
      },
    });
    
    return NextResponse.json(updatedStep);
  } catch (error) {
    console.error("Error reordering step:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to reorder step" },
      { status: 500 }
    );
  }
} 