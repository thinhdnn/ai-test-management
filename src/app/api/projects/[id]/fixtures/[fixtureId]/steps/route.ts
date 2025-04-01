import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserId, AuditFields } from "@/lib/auth-utils";

// Step input validation schema
const stepSchema = z.object({
  action: z.string().min(1, "Action is required"),
  data: z.string().optional(),
  expected: z.string().optional(),
  playwrightCode: z.string().optional(),
  selector: z.string().optional(),
  order: z.number().default(0),
  disabled: z.boolean().default(false),
});

// GET /api/projects/[id]/fixtures/[fixtureId]/steps - Get all steps for a fixture
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fixtureId: string }> }
) {
  try {
    // Await params trước khi sử dụng
    const resolvedParams = await params;
    const fixtureId = resolvedParams.fixtureId;

    // Get all steps for the fixture
    const steps = await prisma.testStep.findMany({
      where: {
        fixtureId,
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(steps);
  } catch (error) {
    console.error("Error fetching fixture steps:", error);
    return NextResponse.json(
      { error: "Failed to fetch fixture steps" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/fixtures/[fixtureId]/steps - Create a new step for a fixture
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string } }
) {
  try {
    const { fixtureId } = await Promise.resolve(params);
    const userId = getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get the fixture to ensure it exists
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

    // Get the step data from request body
    const body = await request.json();
    
    // Validate the input data
    const validatedData = stepSchema.parse(body);
    
    // Get the highest order value to place the new step at the end
    const lastStep = await prisma.testStep.findFirst({
      where: {
        fixtureId,
      },
      orderBy: {
        order: "desc",
      },
    });

    const order = lastStep ? lastStep.order + 1 : 0;
    
    // Create the step
    const step = await prisma.testStep.create({
      data: {
        ...validatedData,
        fixtureId,
        order,
        ...AuditFields.forCreate(userId),
      },
    });

    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    console.error("Error creating fixture step:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create fixture step" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/fixtures/[fixtureId]/steps - Delete all steps for a fixture
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string } }
) {
  try {
    const { fixtureId } = await Promise.resolve(params);
    const userId = getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Delete all steps for the fixture
    await prisma.testStep.deleteMany({
      where: {
        fixtureId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fixture steps:", error);
    return NextResponse.json(
      { error: "Failed to delete fixture steps" },
      { status: 500 }
    );
  }
} 