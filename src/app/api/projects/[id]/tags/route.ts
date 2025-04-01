import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/projects/[id]/tags
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    // Ensure params.id exists
    if (!params?.id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const projectId = params.id;

    // Get all custom tags for the project
    const tags = await prisma.tag.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/tags
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    // Ensure params.id exists
    if (!params?.id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const projectId = params.id;
    const { value, label } = await request.json();

    // Validate input
    if (!value) {
      return NextResponse.json(
        { error: "Tag value is required" },
        { status: 400 }
      );
    }

    // Check if tag already exists
    const existingTag = await prisma.tag.findFirst({
      where: {
        projectId,
        value,
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: "Tag already exists" },
        { status: 400 }
      );
    }

    // Create new tag
    const tag = await prisma.tag.create({
      data: {
        value,
        label: label || value.replace('@', ''),
        projectId,
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
} 