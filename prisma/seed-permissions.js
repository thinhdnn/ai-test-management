const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding permissions...");

  // Delete existing data to avoid duplication
  await prisma.rolePermission.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.permissionAssignment.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});

  // Create project permissions
  const projectPermissions = [
    { name: "project.create", description: "Allow creating new projects" },
    { name: "project.read", description: "Allow viewing project information" },
    {
      name: "project.update",
      description: "Allow updating project information",
    },
    { name: "project.delete", description: "Allow deleting projects" },
    { name: "project.run", description: "Allow running tests on projects" },
  ];

  // Create testcase permissions
  const testCasePermissions = [
    { name: "testcase.create", description: "Allow creating new test cases" },
    {
      name: "testcase.read",
      description: "Allow viewing test case information",
    },
    { name: "testcase.update", description: "Allow updating test cases" },
    { name: "testcase.delete", description: "Allow deleting test cases" },
    { name: "testcase.run", description: "Allow running specific test cases" },
  ];

  // Create system permissions
  const systemPermissions = [
    {
      name: "settings.manage",
      description: "Allow managing system settings",
    },
    { name: "users.manage", description: "Allow managing users" },
    {
      name: "roles.manage",
      description: "Allow managing roles and permissions",
    },
  ];

  // Combine all permissions
  const allPermissions = [
    ...projectPermissions,
    ...testCasePermissions,
    ...systemPermissions,
  ];

  // Save permissions to database
  console.log("Creating permissions...");
  for (const permission of allPermissions) {
    await prisma.permission.create({
      data: permission,
    });
  }

  // Create default roles
  console.log("Creating roles...");

  // Admin role - has all permissions
  const adminRole = await prisma.role.create({
    data: {
      name: "Admin",
      description: "Administrator with full permissions",
    },
  });

  // Project Manager role
  const projectManagerRole = await prisma.role.create({
    data: {
      name: "Project Manager",
      description: "Project manager with project management permissions",
    },
  });

  // Tester role
  const testerRole = await prisma.role.create({
    data: {
      name: "Tester",
      description: "Tester with test case creation and execution permissions",
    },
  });

  // Viewer role
  const viewerRole = await prisma.role.create({
    data: {
      name: "Viewer",
      description: "Viewer with read-only permissions",
    },
  });

  // Get all created permissions
  const permissions = await prisma.permission.findMany();

  // Assign permissions to Admin role
  console.log("Assigning permissions to Admin role...");
  for (const permission of permissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Assign permissions to Project Manager role
  console.log("Assigning permissions to Project Manager role...");
  for (const permission of permissions) {
    if (
      permission.name.startsWith("project.") ||
      permission.name === "testcase.read" ||
      permission.name === "testcase.run"
    ) {
      await prisma.rolePermission.create({
        data: {
          roleId: projectManagerRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Assign permissions to Tester role
  console.log("Assigning permissions to Tester role...");
  for (const permission of permissions) {
    if (
      permission.name.startsWith("testcase.") ||
      permission.name === "project.read" ||
      permission.name === "project.run"
    ) {
      await prisma.rolePermission.create({
        data: {
          roleId: testerRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Assign permissions to Viewer role
  console.log("Assigning permissions to Viewer role...");
  for (const permission of permissions) {
    if (
      permission.name === "project.read" ||
      permission.name === "testcase.read"
    ) {
      await prisma.rolePermission.create({
        data: {
          roleId: viewerRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
