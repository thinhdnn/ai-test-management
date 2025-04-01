import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/settings/rbac/permissions/assignments - Lấy danh sách phân quyền
export async function GET() {
  try {
    const permissionAssignments = await prisma.permissionAssignment.findMany();
    return NextResponse.json(permissionAssignments);
  } catch (error) {
    console.error("Error fetching permission assignments:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/settings/rbac/permissions/assignments - Assign a permission to a role
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roleId, permissionId, userId, resourceType, resourceId } = body;

    // For role permission assignment
    if (roleId && permissionId) {
      // Check if role exists
      const role = await prisma.role.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        return NextResponse.json(
          { message: "Role not found" },
          { status: 404 }
        );
      }

      // Check if permission exists
      const permission = await prisma.permission.findUnique({
        where: { id: permissionId },
      });

      if (!permission) {
        return NextResponse.json(
          { message: "Permission not found" },
          { status: 404 }
        );
      }

      // Check if assignment already exists
      const existingAssignment = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
      });

      if (existingAssignment) {
        return NextResponse.json(
          { message: "Permission already assigned to this role" },
          { status: 400 }
        );
      }

      // Create assignment
      const rolePermission = await prisma.rolePermission.create({
        data: {
          roleId,
          permissionId,
        },
        include: {
          permission: true,
        },
      });

      return NextResponse.json(rolePermission, { status: 201 });
    }

    // For resource-specific permission assignment
    if (userId && permissionId && resourceType && resourceId) {
      // Validate input
      if (!userId || !resourceType || !resourceId) {
        return NextResponse.json(
          { message: "Thiếu thông tin cần thiết" },
          { status: 400 }
        );
      }

      // Validate resource type
      if (!["project", "testcase"].includes(resourceType)) {
        return NextResponse.json(
          { message: "Loại tài nguyên không hợp lệ" },
          { status: 400 }
        );
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }

      // Check if resource exists
      if (resourceType === "project") {
        const project = await prisma.project.findUnique({
          where: { id: resourceId },
        });

        if (!project) {
          return NextResponse.json(
            { message: "Không tìm thấy dự án" },
            { status: 404 }
          );
        }
      } else if (resourceType === "testcase") {
        const testCase = await prisma.testCase.findUnique({
          where: { id: resourceId },
        });

        if (!testCase) {
          return NextResponse.json(
            { message: "Không tìm thấy test case" },
            { status: 404 }
          );
        }
      }

      // Check if permission exists
      const permission = await prisma.permission.findUnique({
        where: { id: permissionId },
      });

      if (!permission) {
        return NextResponse.json(
          { message: "Permission not found" },
          { status: 404 }
        );
      }

      // Delete existing assignments
      await prisma.permissionAssignment.deleteMany({
        where: {
          userId,
          resourceType,
          resourceId,
        },
      });

      // Add new permission assignments
      if (permissionId) {
        const assignment = {
          userId,
          permissionId,
          resourceType,
          resourceId,
        };

        await prisma.permissionAssignment.create({
          data: assignment,
        });
      }

      // Get updated permission assignments
      const updatedAssignments = await prisma.permissionAssignment.findMany({
        where: {
          userId,
          resourceType,
          resourceId,
        },
        include: {
          permission: true,
        },
      });

      return NextResponse.json(updatedAssignments);
    }

    return NextResponse.json(
      { message: "Missing required parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating permission assignment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/rbac/permissions/assignments - Remove a permission from a role
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId");
    const permissionId = searchParams.get("permissionId");

    // If request has a body, use that instead of search params
    let body = null;
    try {
      body = await req.json();
    } catch (e) {
      // No body, continue with search params
    }

    const roleIdToUse = body?.roleId || roleId;
    const permissionIdToUse = body?.permissionId || permissionId;

    if (!roleIdToUse || !permissionIdToUse) {
      return NextResponse.json(
        { message: "Missing required parameters: roleId and permissionId" },
        { status: 400 }
      );
    }

    // Check if assignment exists
    const existingAssignment = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: roleIdToUse,
          permissionId: permissionIdToUse,
        },
      },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { message: "Permission assignment not found" },
        { status: 404 }
      );
    }

    // Delete the assignment
    await prisma.rolePermission.delete({
      where: {
        id: existingAssignment.id,
      },
    });

    return NextResponse.json(
      { message: "Permission assignment removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting permission assignment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
