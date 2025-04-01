import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserId, AuditFields } from "@/lib/auth-utils";

// Bulk delete validation schema
const bulkDeleteSchema = z.object({
  stepIds: z.array(z.string()).min(1, "At least one step ID is required"),
});

// DELETE /api/projects/[id]/fixtures/[fixtureId]/steps/bulk-delete - Delete multiple steps at once
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string } }
) {
  try {
    const { id, fixtureId } = await Promise.resolve(params);
    const userId = getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get the step IDs from request body
    const body = await request.json();
    const validatedData = bulkDeleteSchema.parse(body);
    const { stepIds } = validatedData;
    
    // Verify the fixture exists
    const fixture = await prisma.fixture.findUnique({
      where: {
        id: fixtureId,
      },
    });

    if (!fixture) {
      return NextResponse.json(
        { error: "Fixture not found" },
        { status: 404 }
      );
    }
    
    // Delete the steps in bulk
    const result = await prisma.testStep.deleteMany({
      where: {
        id: { in: stepIds },
        fixtureId, // Ensure we only delete steps for this fixture
      },
    });

    return NextResponse.json({ 
      success: true,
      deleted: result.count
    });
  } catch (error) {
    console.error("Error bulk deleting steps:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to delete steps" },
      { status: 500 }
    );
  }
} 