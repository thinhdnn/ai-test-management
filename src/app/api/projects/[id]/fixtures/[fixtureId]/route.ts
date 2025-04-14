import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserId, AuditFields } from "@/lib/auth-utils";

// Fixture input validation schema
const fixtureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.string().default("data"),
  content: z.string().optional(),
  tags: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fixtureId: string }> }
) {
  try {
    // Await params trước khi sử dụng
    const resolvedParams = await params;
    const fixtureId = resolvedParams.fixtureId;
    const projectId = resolvedParams.id;

    // Get the fixture by ID
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

    return NextResponse.json(fixture);
  } catch (error) {
    console.error("Error fetching fixture:", error);
    return NextResponse.json(
      { error: "Failed to fetch fixture" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fixtureId: string }> }
) {
  try {
    // Await params trước khi sử dụng
    const resolvedParams = await params;
    const fixtureId = resolvedParams.fixtureId;
    const userId = getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get the fixture data from request body
    const body = await request.json();
    
    // Cập nhật schema để chấp nhận null cho tags
    const fixtureSchemaForUpdate = fixtureSchema.extend({
      tags: z.string().nullable().optional(),
    });
    
    // Validate the input data với schema đã cập nhật
    const validatedData = fixtureSchemaForUpdate.parse(body);
    
    // Update the fixture
    const fixture = await prisma.fixture.update({
      where: {
        id: fixtureId,
      },
      data: {
        ...validatedData,
        ...AuditFields.forUpdate(userId),
      },
    });

    return NextResponse.json(fixture);
  } catch (error) {
    console.error("Error updating fixture:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update fixture" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string } }
) {
  try {
    const { fixtureId } = params;
    const userId = getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if fixture exists
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

    // Delete the fixture
    await prisma.fixture.delete({
      where: {
        id: fixtureId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fixture:", error);
    return NextResponse.json(
      { error: "Failed to delete fixture" },
      { status: 500 }
    );
  }
} 