import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/settings/rbac/roles - Get list of roles
export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/settings/rbac/roles - Create new role
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, description } = data;

    // Validate input
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 409 }
      );
    }

    // Create new role
    const newRole = await prisma.role.create({
      data: {
        name,
        description: description || "",
      },
    });

    return NextResponse.json(newRole);
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { roles, permissions, rolePermissions } = data;

    // For security, you might want to add authorization check here
    // if (!isAuthorized()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Update role-permission mappings
    for (const roleId in rolePermissions) {
      // Get current permissions for this role
      const currentRolePermissions = await prisma.rolePermission.findMany({
        where: { roleId },
        select: { permissionId: true },
      });
      const currentPermissionIds = currentRolePermissions.map(
        (rp) => rp.permissionId
      );

      // Permissions to add (in new but not in current)
      const permissionsToAdd = rolePermissions[roleId].filter(
        (permId: string) => !currentPermissionIds.includes(permId)
      );

      // Permissions to remove (in current but not in new)
      const permissionsToRemove = currentPermissionIds.filter(
        (permId) => !rolePermissions[roleId].includes(permId)
      );

      // Add new permissions
      for (const permissionId of permissionsToAdd) {
        await prisma.rolePermission.create({
          data: {
            roleId,
            permissionId,
          },
        });
      }

      // Remove permissions
      if (permissionsToRemove.length > 0) {
        await prisma.rolePermission.deleteMany({
          where: {
            roleId,
            permissionId: {
              in: permissionsToRemove,
            },
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating roles:", error);
    return NextResponse.json(
      { error: "Failed to update roles" },
      { status: 500 }
    );
  }
}
