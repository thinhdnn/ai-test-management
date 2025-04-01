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
    const { id } = params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Get user roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId: id },
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

// PUT /api/settings/rbac/users/[id]/roles - Update user roles
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await req.json();
    const { roleIds } = body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Delete existing roles
    await prisma.userRole.deleteMany({
      where: { userId: id },
    });

    // Add new roles
    if (roleIds && roleIds.length > 0) {
      const userRoles = roleIds.map((roleId: string) => ({
        userId: id,
        roleId,
      }));

      await prisma.userRole.createMany({
        data: userRoles,
      });
    }

    // Return updated user with roles
    const updatedUser = await prisma.user.findUnique({
      where: { id },
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
