// Define common types for the entire application

// Project type - project management
export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  browser: string;
  environment: string;
  library: string | null;
  playwrightProjectPath: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  createdByUsername?: string | null;
  lastRunBy?: string | null;
  lastRunByUsername?: string | null;
  testCases?: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
  };
}

// TestCase type - test case management
export interface TestCase {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  lastRun: string | Date | null;
  createdBy?: string | null;
  createdByUsername?: string | null;
  updatedBy?: string | null;
  updatedByUsername?: string | null;
  lastRunBy?: string | null;
  lastRunByUsername?: string | null;
  tags: string | null;
  projectId: string;
  steps?: number;
  testFilePath?: string | null;
  playwrightCodeSource?: string;
  playwrightTestScript?: string | null;
  version: string;
  isManual?: boolean;
}

// TestCaseWithProject type - test case with project information
export interface TestCaseWithProject extends TestCase {
  project: Project;
  testFilePath: string | null;
  testSteps?: TestStep[];
}

// TestStep type - test steps management
export interface TestStep {
  id: string;
  order: number;
  action: string;
  data: string | null;
  expected: string | null;
  playwrightCode: string | null;
  disabled: boolean;
  testCaseId: string;
  selector?: string | null;
  fixtureId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy?: string | null;
  updatedBy?: string | null;
}

// TestCaseVersion type - test case version management
export interface TestCaseVersion {
  id: string;
  testCaseId: string;
  version: string;
  name: string;
  description?: string | null;
  playwrightTestScript?: string | null;
  createdAt: string | Date;
  createdBy?: string | null;
}

// TestStepVersion type - test step version management
export interface TestStepVersion {
  id: string;
  testCaseVersionId: string;
  action: string;
  data: string | null;
  expected: string | null;
  playwrightCode: string | null;
  selector: string | null;
  order: number;
  disabled: boolean;
  createdAt: string | Date;
  createdBy?: string | null;
}

// Gemini and AI related types

// Supported test step types
export type GeminiTestStepAction =
  | "navigate"
  | "click"
  | "fill"
  | "type"
  | "select"
  | "wait"
  | "assert"
  | "expect"
  | string;

export interface GeminiTestStepRequest {
  action: string;
  description?: string;
  data?: string;
  expected?: string;
  selector?: string;
}

export interface GeminiTestStepResponse {
  action: string;
  selector: string;
  data: string | null;
  expected: string;
  command?: string;
  geminiEnhanced?: boolean;
  playwrightCode?: string;
}

export interface GeminiTestStepRequestWithHTML extends GeminiTestStepRequest {
  htmlContext?: string;
  screenshot?: Buffer;
}

// Playwright related types
export interface PlaywrightTestCase {
  filePath: string;
  content: string;
}

export interface PlaywrightInitOptions {
  projectPath: string;
  browser: string;
  testDir?: string;
  baseUrl?: string;
  useTypescript?: boolean;
  usePOM?: boolean; // Page Object Model
  useGitHub?: boolean;
}

export interface RunPlaywrightTestOptions {
  projectPath: string;
  testFile?: string;
  browser?: string;
  headless?: boolean;
  workers?: number;
}

// Keyboard shortcuts
export type PageKey =
  | "projects"
  | "testCases"
  | "testCaseDetail"
  | "settings"
  | "help"
  | "home";

export type KeyboardShortcut = {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
};

export interface AnalyzePlaywrightRequest {
  playwrightCode: string;
}

export interface AnalyzePlaywrightResponse {
  success: boolean;
  testSteps: GeminiTestStepResponse[];
}

// Define props and interfaces for DnD
export interface TestStepsTableProps {
  testSteps: TestStep[];
  onReorder: (reorderedSteps: TestStep[]) => Promise<void>;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleDisable: (id: string, disabled: boolean) => void;
  onClone: (step: TestStep) => void;
}

export interface TestStepRowProps {
  id?: string;
  step: TestStep;
  isSelected: boolean;
  onSelect: (id: string, isSelected: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleDisable: (id: string, disabled: boolean) => void;
  onClone: (step: TestStep) => void;
}
