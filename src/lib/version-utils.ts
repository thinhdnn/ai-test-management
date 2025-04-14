import { prisma } from "@/lib/db";
import { TestCase, TestStep, TestCaseVersion, TestStepVersion } from "@/types";

// Keep track of last version creation time for each test case to prevent duplicates
const lastVersionCreated: Record<string, number> = {};
const VERSION_DEBOUNCE_TIME = 30000; // 30 seconds, tăng từ 5 lên 30 giây

/**
 * Check if a version was recently created for this test case (within the debounce time)
 * @param testCaseId - The ID of the test case
 * @returns True if a version was recently created
 */
function wasVersionRecentlyCreated(testCaseId: string): boolean {
  const now = Date.now();
  const lastCreated = lastVersionCreated[testCaseId] || 0;
  
  // If less than debounce time has passed since last version creation
  const debounced = (now - lastCreated) < VERSION_DEBOUNCE_TIME;
  
  if (debounced) {
    const timeAgo = Math.round((now - lastCreated) / 1000);
    console.log(`Debouncing version creation for test case ${testCaseId} (last created ${timeAgo}s ago)`);
  }
  
  return debounced;
}

/**
 * Mark a version as having been created for a test case
 * @param testCaseId - The ID of the test case
 */
function markVersionCreated(testCaseId: string): void {
  const previousTime = lastVersionCreated[testCaseId];
  lastVersionCreated[testCaseId] = Date.now();
  
  if (previousTime) {
    const timeSinceLastVersion = Math.round((Date.now() - previousTime) / 1000);
    console.log(`Updated version timestamp for test case ${testCaseId} (${timeSinceLastVersion}s since last version)`);
  } else {
    console.log(`Marked first version creation for test case ${testCaseId}`);
  }
}

/**
 * Creates a new version for a test case using testCaseId
 * @param testCaseId - The ID of the test case
 * @param userId - ID of the current user
 * @param version - Optional version string (will use current test case's version if not provided)
 * @param force - If true, create version even if one was recently created
 * @returns The new test case version or null if debounced
 */
export async function createNewVersion(
  testCaseId: string,
  userId: string | undefined,
  version?: string,
  force?: boolean
): Promise<TestCaseVersion | null>;

/**
 * Creates a new version for a test case
 * @param testCase - The test case object
 * @param userId - ID of the current user
 * @param version - The new version string
 * @param force - If true, create version even if one was recently created
 * @returns The updated test case version or null if debounced
 */
export async function createNewVersion(
  testCase: TestCase,
  userId: string | null,
  version: string,
  force?: boolean
): Promise<TestCaseVersion | null>;

export async function createNewVersion(
  testCaseOrId: TestCase | string,
  userId: string | null | undefined,
  version?: string,
  force: boolean = false
): Promise<TestCaseVersion | null> {
  const source = typeof testCaseOrId === 'string' ? 'id' : 'object';
  console.log(`createNewVersion called with testCase ${source}, force=${force}`);
  
  // Handle different parameter types
  let testCaseId: string;
  let testCaseName: string;
  let testCaseDescription: string;
  let testCaseScript: string | null;
  let versionToUse: string;

  // If first param is a string (testCaseId)
  if (typeof testCaseOrId === 'string') {
    testCaseId = testCaseOrId;
    
    // Check for recent version creation unless forced
    if (!force && wasVersionRecentlyCreated(testCaseId)) {
      console.log(`Skipping version creation for test case ${testCaseId} (debounced)`);
      return null;
    }
    
    // Fetch the test case by ID
    const testCase = await prisma.testCase.findUnique({
      where: { id: testCaseId },
    });

    if (!testCase) {
      throw new Error(`Test case ${testCaseId} not found`);
    }

    testCaseName = testCase.name;
    testCaseDescription = testCase.description || "";
    testCaseScript = testCase.playwrightTestScript;
    versionToUse = version || testCase.version;
  } else {
    // First param is a TestCase object
    testCaseId = testCaseOrId.id;
    
    // Check for recent version creation unless forced
    if (!force && wasVersionRecentlyCreated(testCaseId)) {
      console.log(`Skipping version creation for test case ${testCaseId} (debounced)`);
      return null;
    }
    
    testCaseName = testCaseOrId.name;
    testCaseDescription = testCaseOrId.description || "";
    testCaseScript = testCaseOrId.playwrightTestScript || null;
    versionToUse = version || testCaseOrId.version;
  }
  
  // Mark this test case as having a version created now
  markVersionCreated(testCaseId);
  console.log(`Creating version for test case ${testCaseId}, version=${versionToUse}`);

  const versionData = {
    testCaseId: testCaseId,
    version: versionToUse,
    name: testCaseName,
    description: testCaseDescription,
    playwrightTestScript: testCaseScript || "",
    createdBy: userId || null,
  };

  const newVersion = await prisma.testCaseVersion.create({
    data: versionData,
  });

  // Create versions for each test step
  const testSteps = await prisma.testStep.findMany({
    where: { testCaseId: testCaseId },
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
  // Remove any updatedBy from data since it's not in the schema
  const { updatedBy, ...updateData } = data as any;

  return prisma.testCaseVersion.update({
    where: { id: version.id },
    data: updateData,
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
