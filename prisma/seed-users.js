const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding users...");

  // Xóa người dùng hiện có (tùy chọn)
  try {
    await prisma.user.deleteMany();
    console.log("Deleted existing users");
  } catch (error) {
    console.log("No existing users to delete or error occurred:", error);
  }

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      username: "admin",
      password: adminPassword,
      role: "admin",
    },
  });
  console.log("Created admin user");

  // Test user
  const userPassword = await bcrypt.hash("user123", 10);
  await prisma.user.create({
    data: {
      username: "user",
      password: userPassword,
      role: "user",
    },
  });
  console.log("Created regular user");

  console.log("Seeding finished");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
