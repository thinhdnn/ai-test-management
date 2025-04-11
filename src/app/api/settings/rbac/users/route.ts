import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        username: "asc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users for RBAC:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { userRoles } = data;

    // For security, you might want to add authorization check here
    // if (!isAuthorized()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!userRoles || !Array.isArray(userRoles)) {
      return NextResponse.json(
        { error: "Invalid user roles data format" },
        { status: 400 }
      );
    }

    // Process each user's role assignments
    for (const assignment of userRoles) {
      const { userId, roleIds } = assignment;

      if (!userId || !roleIds || !Array.isArray(roleIds)) {
        continue; // Skip invalid entries
      }

      // Get current roles for this user
      const currentUserRoles = await prisma.userRole.findMany({
        where: { userId },
        select: { roleId: true },
      });
      const currentRoleIds = currentUserRoles.map((ur) => ur.roleId);

      // Roles to add (in new but not in current)
      const rolesToAdd = roleIds.filter(
        (roleId: string) => !currentRoleIds.includes(roleId)
      );

      // Roles to remove (in current but not in new)
      const rolesToRemove = currentRoleIds.filter(
        (roleId) => !roleIds.includes(roleId)
      );

      // Add new roles
      for (const roleId of rolesToAdd) {
        await prisma.userRole.create({
          data: {
            userId,
            roleId,
          },
        });
      }

      // Remove roles
      if (rolesToRemove.length > 0) {
        await prisma.userRole.deleteMany({
          where: {
            userId,
            roleId: {
              in: rolesToRemove,
            },
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user roles:", error);
    return NextResponse.json(
      { error: "Failed to update user roles" },
      { status: 500 }
    );
  }
} 