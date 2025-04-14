import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserId, AuditFields } from "@/lib/auth-utils";
import { getAIService } from "@/lib/ai-service";
import { getAIProviderType } from "@/lib/ai-provider";

// Step input validation schema
const stepSchema = z.object({
  action: z.string().min(1, "Action is required"),
  data: z.string().optional(),
  expected: z.string().optional(),
  playwrightCode: z.string().optional(),
  selector: z.string().optional(),
  disabled: z.boolean().default(false),
});

// Reorder validation schema
const reorderSchema = z.object({
  order: z.number().min(0),
});

// GET /api/projects/[id]/fixtures/[fixtureId]/steps/[stepId] - Get a step
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string; stepId: string } }
) {
  try {
    // Use params with await
    const { stepId } = await Promise.resolve(params);
    const userId = getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get the step
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

    return NextResponse.json(step);
  } catch (error) {
    console.error("Error fetching step:", error);
    return NextResponse.json(
      { error: "Failed to fetch step" },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/fixtures/[fixtureId]/steps/[stepId] - Update a step
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string; stepId: string } }
) {
  try {
    // Use params with await
    const { id, fixtureId, stepId } = await Promise.resolve(params);
    const userId = getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

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

    // Check if this is a reorder request (special case)
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const body = await request.json();
      
      // If this is just a reorder request, handle it separately
      if (body.order !== undefined && Object.keys(body).length === 1) {
        const validatedData = reorderSchema.parse(body);
        
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
      }
      
      // Regular update
      const validatedData = stepSchema.parse(body);
      
      // Only process the Playwright code update if the action or data or expected has changed
      if (
        step.action !== validatedData.action ||
        step.data !== validatedData.data ||
        step.expected !== validatedData.expected
      ) {
        try {
          // Get the current fixture to know the test name
          const fixture = await prisma.fixture.findUnique({
            where: {
              id: fixtureId,
            },
          });
          
          if (fixture && step.playwrightCode) {
            // Convert the database step to the format expected by the AI service
            const originalStep = {
              id: step.id,
              order: step.order,
              action: step.action,
              data: step.data || null,
              expected: step.expected || null,
            };
            
            // Create the modified step with the new values
            const modifiedStep = {
              id: step.id,
              order: step.order,
              action: validatedData.action,
              data: validatedData.data || null,
              expected: validatedData.expected || null,
            };
            
            // Get the current AI provider
            const aiProvider = await getAIProviderType();
            const aiService = await getAIService();
            
            // Update the Playwright code
            const updatedCode = await aiService.updatePlaywrightWithModifiedSteps(
              step.playwrightCode,
              [originalStep],
              [modifiedStep],
              aiProvider
            );
            
            // Add the updated Playwright code to the data to be saved
            validatedData.playwrightCode = updatedCode;
          }
        } catch (error) {
          console.error("Error updating Playwright code:", error);
          // Continue with the save even if updating the code fails
        }
      }
      
      // Update the step
      const updatedStep = await prisma.testStep.update({
        where: {
          id: stepId,
        },
        data: {
          ...validatedData,
          ...AuditFields.forUpdate(userId),
        },
      });

      return NextResponse.json(updatedStep);
    }
    
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating step:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update step" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/fixtures/[fixtureId]/steps/[stepId] - Delete a step
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fixtureId: string; stepId: string } }
) {
  try {
    // Use params with await
    const { id, fixtureId, stepId } = await Promise.resolve(params);
    const userId = getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

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

    // Delete the step
    await prisma.testStep.delete({
      where: {
        id: stepId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting step:", error);
    return NextResponse.json(
      { error: "Failed to delete step" },
      { status: 500 }
    );
  }
} 