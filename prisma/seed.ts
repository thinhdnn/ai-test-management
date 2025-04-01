import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Password hashing function using bcrypt (same as login API)
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: await hashPassword("admin123"),
      role: "admin",
    },
  });

  console.log(`Created admin user: ${adminUser.username}`);

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { username: "user" },
    update: {},
    create: {
      username: "user",
      password: await hashPassword("user123"),
      role: "user",
    },
  });

  console.log(`Created demo user: ${demoUser.username}`);

  // Add default settings
  const defaultSettings = [
    { key: "language", value: "en" },
    { key: "theme", value: "light" },
    { key: "notifications", value: "true" },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
    console.log(`Added/updated setting: ${setting.key} = ${setting.value}`);
  }

  // Add a demo project if none exists
  const projectCount = await prisma.project.count();

  if (projectCount === 0) {
    const demoProject = await prisma.project.create({
      data: {
        name: "Demo Project",
        description: "A sample project to demonstrate features",
        url: "https://example.com",
        browser: "chromium",
        environment: "development",
      },
    });

    console.log(`Created demo project: ${demoProject.name}`);

    // Add a sample test case to the demo project
    const testCase = await prisma.testCase.create({
      data: {
        projectId: demoProject.id,
        name: "Login Test",
        description: "Verify user can log in successfully",
        status: "pending",
        tags: JSON.stringify(["authentication", "smoke"]),
        testSteps: {
          create: [
            {
              action: "navigate",
              data: "https://example.com/login",
              expected: "Login page",
              order: 1,
            },
            {
              action: "fill",
              data: 'input[name="username"] >> user@example.com',
              order: 2,
            },
            {
              action: "fill",
              data: 'input[name="password"] >> password123',
              order: 3,
            },
            {
              action: "click",
              data: 'button[type="submit"]',
              order: 4,
            },
            {
              action: "expect",
              data: "text=Welcome",
              expected: "User should be logged in and see welcome message",
              order: 5,
            },
          ],
        },
      },
      include: {
        testSteps: true,
      },
    });

    console.log(
      `Created test case: ${testCase.name} with ${testCase.testSteps.length} steps`
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
