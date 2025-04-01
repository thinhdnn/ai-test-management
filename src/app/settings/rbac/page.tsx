import { Metadata } from "next";
import { RBACClient } from "./page.client";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "RBAC Settings",
  description: "Manage role-based access control",
};

// Lấy dữ liệu cần thiết cho RBAC panel
async function getRBACData() {
  // Lấy tất cả roles
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

  console.log("Fetched roles:", JSON.stringify(roles, null, 2));

  // Lấy tất cả permissions
  const permissions = await prisma.permission.findMany({
    orderBy: {
      name: "asc",
    },
  });

  // Lấy tất cả users
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

  return {
    roles,
    permissions,
    users,
  };
}

export default async function RBACPage() {
  const { roles, permissions, users } = await getRBACData();

  return (
    <RBACClient
      initialRoles={roles}
      initialPermissions={permissions}
      initialUsers={users}
    />
  );
}
