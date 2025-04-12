import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/settings/rbac/users/[id]/roles - Get user roles
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    if (!params || !params.id) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }

    const userId = params.id;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Get user roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true,
      },
    });

    return NextResponse.json(userRoles);
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/settings/rbac/users/[id]/roles - Assign a role to a user
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    if (!params || !params.id) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }

    const userId = params.id;
    const body = await req.json();
    const { roleId } = body;

    if (!roleId) {
      return NextResponse.json(
        { message: "Role ID is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    // Remove any existing roles if needed (making sure user has only one role)
    await prisma.userRole.deleteMany({
      where: { userId },
    });

    // Create user role assignment
    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
      include: {
        role: true,
      },
    });

    return NextResponse.json(userRole);
  } catch (error) {
    console.error("Error assigning role to user:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/settings/rbac/users/[id]/roles - Update user roles
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    if (!params || !params.id) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }

    const userId = params.id;
    const body = await req.json();
    const { roleIds } = body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Delete existing roles
    await prisma.userRole.deleteMany({
      where: { userId },
    });

    // Add new roles
    if (roleIds && roleIds.length > 0) {
      const userRoles = roleIds.map((roleId: string) => ({
        userId,
        roleId,
      }));

      await prisma.userRole.createMany({
        data: userRoles,
      });
    }

    // Return updated user with roles
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user roles:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
