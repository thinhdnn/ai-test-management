const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Password hashing function using bcrypt (same as login API)
async function hashPassword(password) {
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
      password: await hashPassword("admin123"), // Using bcrypt for consistent hashing
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

  // Add default AI settings
  const defaultAISettings = [
    { key: "ai_provider", value: "gemini" },
    { key: "gemini_api_key", value: process.env.GEMINI_API_KEY || "" },
    {
      key: "gemini_model",
      value: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    },
    { key: "openai_api_key", value: process.env.OPENAI_API_KEY || "" },
    { key: "openai_model", value: process.env.OPENAI_MODEL || "gpt-4" },
    { key: "grok_api_key", value: process.env.GROK_API_KEY || "" },
    {
      key: "grok_api_endpoint",
      value: process.env.GROK_API_ENDPOINT || "https://api.grok.x.com/v1",
    },
    { key: "grok_model", value: process.env.GROK_MODEL || "grok-2-latest" },
    { key: "claude_api_key", value: process.env.CLAUDE_API_KEY || "" },
    {
      key: "claude_api_endpoint",
      value: process.env.CLAUDE_API_ENDPOINT || "https://api.anthropic.com/v1",
    },
    {
      key: "claude_model",
      value: process.env.CLAUDE_MODEL || "claude-3-opus-20240229",
    },
  ];

  for (const setting of defaultAISettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {}, // Don't update existing values, keep user settings
      create: setting,
    });
    console.log(`Added AI setting if not exists: ${setting.key}`);
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

    // Create test steps separately
    const testCase = await prisma.testCase.create({
      data: {
        projectId: demoProject.id,
        name: "Login Test",
        description: "Verify user can log in successfully",
        status: "pending",
        tags: JSON.stringify(["authentication", "smoke"]),
      },
    });

    // Add test steps
    const testSteps = await prisma.testStep.createMany({
      data: [
        {
          testCaseId: testCase.id,
          action: "navigate",
          data: "https://example.com/login",
          expected: "Login page",
          order: 1,
        },
        {
          testCaseId: testCase.id,
          action: "fill",
          data: 'input[name="username"] >> user@example.com',
          order: 2,
        },
        {
          testCaseId: testCase.id,
          action: "fill",
          data: 'input[name="password"] >> password123',
          order: 3,
        },
        {
          testCaseId: testCase.id,
          action: "click",
          data: 'button[type="submit"]',
          order: 4,
        },
        {
          testCaseId: testCase.id,
          action: "expect",
          data: "text=Welcome",
          expected: "User should be logged in and see welcome message",
          order: 5,
        },
      ],
    });

    console.log(`Created test case: ${testCase.name} with 5 steps`);
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
