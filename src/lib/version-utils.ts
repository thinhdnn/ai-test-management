import { prisma } from "@/lib/db";
import { TestCase, TestStep, TestCaseVersion, TestStepVersion } from "@/types";

/**
 * Creates a new version for a test case
 * @param testCase - The test case object
 * @param userId - ID of the current user
 * @param version - The new version string
 * @returns The updated test case version
 */
export async function createNewVersion(
  testCase: TestCase,
  userId: string | null,
  version: string
) {
  const versionData = {
    testCaseId: testCase.id,
    version,
    name: testCase.name,
    description: testCase.description || "",
    playwrightTestScript: testCase.playwrightTestScript || "",
    createdBy: userId || null,
  };

  const newVersion = await prisma.testCaseVersion.create({
    data: versionData,
  });

  // Create versions for each test step
  const testSteps = await prisma.testStep.findMany({
    where: { testCaseId: testCase.id },
    orderBy: { order: "asc" },
  });

  for (const step of testSteps) {
    await prisma.testStepVersion.create({
      data: {
        testCaseVersionId: newVersion.id,
        action: step.action,
        data: step.data || "",
        expected: step.expected || "",
        playwrightCode: step.playwrightCode || "",
        selector: step.selector || "",
        order: step.order,
        disabled: step.disabled,
        createdBy: userId || null,
      },
    });
  }

  return newVersion;
}

/**
 * Restores a test case to a specific version
 * @param testCaseId - ID of the test case
 * @param versionId - ID of the version to restore
 * @param userId - ID of the current user
 */
export async function restoreVersion(
  testCaseId: string,
  versionId: string,
  userId?: string
): Promise<void> {
  // 1. Get the version data with its steps
  const version = await prisma.testCaseVersion.findUnique({
    where: { id: versionId },
    include: { testStepVersions: { orderBy: { order: "asc" } } },
  });

  if (!version || version.testCaseId !== testCaseId) {
    throw new Error(
      `Version ${versionId} not found for test case ${testCaseId}`
    );
  }

  // 2. Update test case with version data
  await prisma.testCase.update({
    where: { id: testCaseId },
    data: {
      name: version.name,
      description: version.description,
      playwrightTestScript: version.playwrightTestScript,
      version: version.version,
      updatedBy: userId || null,
    },
  });

  // 3. Delete existing steps
  await prisma.testStep.deleteMany({
    where: { testCaseId },
  });

  // 4. Create new steps from version
  for (const step of version.testStepVersions) {
    await prisma.testStep.create({
      data: {
        testCaseId,
        action: step.action,
        data: step.data || null,
        expected: step.expected || null,
        playwrightCode: step.playwrightCode || null,
        selector: step.selector || null,
        order: step.order,
        disabled: step.disabled,
        createdBy: userId || null,
      },
    });
  }
}

/**
 * Gets all versions for a test case
 * @param testCaseId - ID of the test case
 * @returns Array of versions
 */
export async function getTestCaseVersions(testCaseId: string) {
  return prisma.testCaseVersion.findMany({
    where: { testCaseId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateVersion(
  version: TestCaseVersion,
  userId: string | null,
  data: Partial<TestCaseVersion>
) {
  return prisma.testCaseVersion.update({
    where: { id: version.id },
    data: {
      ...data,
      updatedBy: userId || null,
    },
  });
}

export async function createTestStepVersion(
  testCaseVersionId: string,
  step: TestStep,
  userId: string | null
) {
  return prisma.testStepVersion.create({
    data: {
      testCaseVersionId,
      action: step.action,
      data: step.data || "",
      expected: step.expected || "",
      playwrightCode: step.playwrightCode || "",
      selector: step.selector || "",
      order: step.order,
      disabled: step.disabled,
      createdBy: userId || null,
    },
  });
}
