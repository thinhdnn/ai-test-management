import { prisma } from "@/lib/db";

/**
 * Check if a user has permission to access a resource
 * @param userId User ID
 * @param permissionName Permission name (e.g., "project.read", "testcase.update")
 * @param resourceType Resource type (e.g., "project", "testcase")
 * @param resourceId Resource ID (if applicable)
 * @returns true if has permission, false if not
 */
export async function checkPermission(
  userId: string,
  permissionName: string,
  resourceType?: string,
  resourceId?: string
): Promise<boolean> {
  try {
    // If user doesn't exist, no permission
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // Admin users have full access
    if (user.role === "admin") {
      return true;
    }

    // Get permission ID from name
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!permission) {
      return false;
    }

    // Check permissions from user roles
    const userRolesWithPermission = await prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          permissions: {
            some: {
              permissionId: permission.id,
            },
          },
        },
      },
    });

    // If user has permission through a role, allow access
    if (userRolesWithPermission) {
      return true;
    }

    // If no specific resource, no need for further checks
    if (!resourceType || !resourceId) {
      return false;
    }

    // Check direct permission on the resource
    const permissionAssignment = await prisma.permissionAssignment.findFirst({
      where: {
        userId,
        permissionId: permission.id,
        resourceType,
        resourceId,
      },
    });

    return !!permissionAssignment;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Check if a user has any of the permissions in the list
 * @param userId User ID
 * @param permissionNames List of permission names
 * @param resourceType Resource type
 * @param resourceId Resource ID
 * @returns true if has at least one permission, false if not
 */
export async function hasAnyPermission(
  userId: string,
  permissionNames: string[],
  resourceType?: string,
  resourceId?: string
): Promise<boolean> {
  for (const permissionName of permissionNames) {
    const hasPermission = await checkPermission(
      userId,
      permissionName,
      resourceType,
      resourceId
    );
    if (hasPermission) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a user has all permissions in the list
 * @param userId User ID
 * @param permissionNames List of permission names
 * @param resourceType Resource type
 * @param resourceId Resource ID
 * @returns true if has all permissions, false if not
 */
export async function hasAllPermissions(
  userId: string,
  permissionNames: string[],
  resourceType?: string,
  resourceId?: string
): Promise<boolean> {
  for (const permissionName of permissionNames) {
    const hasPermission = await checkPermission(
      userId,
      permissionName,
      resourceType,
      resourceId
    );
    if (!hasPermission) {
      return false;
    }
  }
  return true;
}
