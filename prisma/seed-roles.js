const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding default roles...");

  // Delete existing roles to avoid duplication
  await prisma.rolePermission.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.role.deleteMany({});

  // Create 4 default roles
  const roles = [
    {
      name: "Administrator",
      description: "Full access to all system features",
    },
    {
      name: "Project Manager",
      description: "Manages projects and associated test cases",
    },
    {
      name: "Tester",
      description: "Creates and executes test cases",
    },
    {
      name: "Viewer",
      description: "View-only access to projects and test cases",
    },
  ];

  // Save roles to database
  console.log("Creating roles...");
  for (const roleData of roles) {
    await prisma.role.create({
      data: roleData,
    });
  }

  // Get all permissions from the database
  const permissions = await prisma.permission.findMany();
  if (permissions.length === 0) {
    console.log(
      "No permissions found in the database. Please run seed-permissions.js first."
    );
    return;
  }

  // Get created roles
  const administrator = await prisma.role.findUnique({
    where: { name: "Administrator" },
  });
  const projectManager = await prisma.role.findUnique({
    where: { name: "Project Manager" },
  });
  const tester = await prisma.role.findUnique({ where: { name: "Tester" } });
  const viewer = await prisma.role.findUnique({ where: { name: "Viewer" } });

  // Assign permissions to Administrator (all permissions)
  console.log("Assigning permissions to Administrator role...");
  for (const permission of permissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: administrator.id,
        permissionId: permission.id,
      },
    });
  }

  // Assign permissions to Project Manager
  console.log("Assigning permissions to Project Manager role...");
  for (const permission of permissions) {
    if (
      permission.name.startsWith("project.") ||
      permission.name === "testcase.read" ||
      permission.name === "testcase.run"
    ) {
      await prisma.rolePermission.create({
        data: {
          roleId: projectManager.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Assign permissions to Tester
  console.log("Assigning permissions to Tester role...");
  for (const permission of permissions) {
    if (
      permission.name.startsWith("testcase.") ||
      permission.name === "project.read" ||
      permission.name === "project.run"
    ) {
      await prisma.rolePermission.create({
        data: {
          roleId: tester.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Assign permissions to Viewer
  console.log("Assigning permissions to Viewer role...");
  for (const permission of permissions) {
    if (
      permission.name === "project.read" ||
      permission.name === "testcase.read"
    ) {
      await prisma.rolePermission.create({
        data: {
          roleId: viewer.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log("Role seeding completed!");
}

// Chạy nếu được gọi trực tiếp
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

// Export để có thể import từ file khác
module.exports = { main };
