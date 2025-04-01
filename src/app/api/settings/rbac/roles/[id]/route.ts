import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/settings/rbac/roles/[id] - Get role information by ID
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/settings/rbac/roles/[id] - Update role
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, description, permissions } = body;

    // Validate input
    if (!name) {
      return NextResponse.json(
        { message: "Role name cannot be empty" },
        { status: 400 }
      );
    }

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    // Check if name is taken (if changing name)
    if (name !== existingRole.name) {
      const nameExists = await prisma.role.findUnique({
        where: { name },
      });

      if (nameExists) {
        return NextResponse.json(
          { message: "A role with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Update role
    await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
      },
    });

    // Update permissions
    if (permissions) {
      // Delete existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Add new permissions
      if (permissions.length > 0) {
        const rolePermissions = permissions.map((permissionId: string) => ({
          roleId: id,
          permissionId,
        }));

        await prisma.rolePermission.createMany({
          data: rolePermissions,
        });
      }
    }

    // Return updated role with permissions
    const updatedRole = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/settings/rbac/roles/[id] - Update a role
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const roleId = params.id;
    const data = await request.json();
    const { name, description } = data;

    // Validate input
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    // Check if another role with the same name exists
    const existingRole = await prisma.role.findFirst({
      where: {
        name,
        id: {
          not: roleId,
        },
      },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 409 }
      );
    }

    // Update the role
    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: {
        name,
        description: description || "",
      },
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/rbac/roles/[id] - Delete a role
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const roleId = params.id;

    // Check if the role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        users: true,
      },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Start a transaction to delete role permissions first, then the role
    await prisma.$transaction([
      // Delete all role permissions
      prisma.rolePermission.deleteMany({
        where: { roleId },
      }),
      // Delete user role assignments
      prisma.userRole.deleteMany({
        where: { roleId },
      }),
      // Delete the role
      prisma.role.delete({
        where: { id: roleId },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
}
