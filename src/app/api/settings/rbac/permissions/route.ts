import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, description } = data;

    // Validate input
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Permission name is required" },
        { status: 400 }
      );
    }

    // Check if permission already exists
    const existingPermission = await prisma.permission.findUnique({
      where: { name },
    });

    if (existingPermission) {
      return NextResponse.json(
        { error: "A permission with this name already exists" },
        { status: 409 }
      );
    }

    // Create new permission
    const newPermission = await prisma.permission.create({
      data: {
        name,
        description: description || "",
      },
    });

    return NextResponse.json(newPermission);
  } catch (error) {
    console.error("Error creating permission:", error);
    return NextResponse.json(
      { error: "Failed to create permission" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}
