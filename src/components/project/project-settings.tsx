import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BROWSER_OPTIONS, ENVIRONMENT_OPTIONS, formatDate } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const REPORTER_OPTIONS = [
  { 
    value: 'html', 
    label: 'HTML Reporter',
    description: 'Generates a self-contained HTML report that can be opened in a browser.',
    icon: '📊'
  },
  { 
    value: 'json', 
    label: 'JSON Reporter',
    description: 'Outputs test results in JSON format for programmatic analysis.',
    icon: '📝'
  },
  { 
    value: 'junit', 
    label: 'JUnit Reporter',
    description: 'Generates JUnit XML reports compatible with CI/CD systems.',
    icon: '🔄'
  },
  { 
    value: 'dot', 
    label: 'Dot Reporter',
    description: 'Minimal reporter showing one character per test.',
    icon: '⚡'
  },
  { 
    value: 'line', 
    label: 'Line Reporter',
    description: 'Shows one line per test for real-time progress.',
    icon: '📈'
  },
  { 
    value: 'list', 
    label: 'List Reporter',
    description: 'Displays a detailed list of test results.',
    icon: '📋'
  },
];

interface ProjectSettingsProps {
  project: any;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  editedProject: any;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  isSaving: boolean;
  playwrightConfig: any;
  handlePlaywrightConfigChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    section: string
  ) => void;
  handlePlaywrightSelectChange: (name: string, value: string) => void;
  handlePlaywrightCheckboxChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  savePlaywrightConfig: () => Promise<void>;
  isSavingConfig: boolean;
  fetchPlaywrightConfig: () => Promise<void>;
  handleReporterChange: (reporters: string[]) => void;
  handleReportFileNameChange: (reporter: string, fileName: string) => void;
}

export function ProjectSettings({
  project,
  editMode,
  setEditMode,
  editedProject,
  handleInputChange,
  handleSelectChange,
  handleSave,
  handleCancel,
  isSaving,
  playwrightConfig,
  handlePlaywrightConfigChange,
  handlePlaywrightSelectChange,
  handlePlaywrightCheckboxChange,
  savePlaywrightConfig,
  isSavingConfig,
  fetchPlaywrightConfig,
  handleReporterChange,
  handleReportFileNameChange,
}: ProjectSettingsProps) {
  const onReporterChange = (reporter: string, isChecked: boolean) => {
    console.log('Reporter changed:', { reporter, isChecked });
    
    const updatedReporters = isChecked
      ? [...(playwrightConfig.reporters || []), reporter]
      : (playwrightConfig.reporters || []).filter((r: string) => r !== reporter);

    console.log('Updated reporters:', updatedReporters);
    
    handleReporterChange(updatedReporters);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>Project details</CardDescription>
          </div>
          <Button
            variant={editMode ? "outline" : "default"}
            onClick={() => setEditMode(!editMode)}
            disabled={isSaving}
          >
            {editMode ? "Cancel Edit" : "Edit Settings"}
          </Button>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={editedProject?.name || ""}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={editedProject?.description || ""}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    name="url"
                    value={editedProject?.url || ""}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="browser">Browser</Label>
                  <Select
                    value={editedProject?.browser || ""}
                    onValueChange={(value) =>
                      handleSelectChange("browser", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select browser" />
                    </SelectTrigger>
                    <SelectContent>
                      {BROWSER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="environment">Environment</Label>
                  <Select
                    value={editedProject?.environment || ""}
                    onValueChange={(value) =>
                      handleSelectChange("environment", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENVIRONMENT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="library">Libraries</Label>
                  <Input
                    id="library"
                    name="library"
                    value={editedProject?.library || ""}
                    onChange={handleInputChange}
                    className="mt-1"
                    placeholder="Optional libraries"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Description
                </h3>
                <p className="mt-1">{project.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Environment
                  </h3>
                  <p className="mt-1">{project.environment}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Libraries
                  </h3>
                  <p className="mt-1">{project.library || "None"}</p>
                </div>
                <div>
                  <Label htmlFor="createdAt">Created Date</Label>
                  <div className="mt-1 text-muted-foreground">
                    {formatDate(new Date(project.createdAt))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="created_by">Created By</Label>
                  <div className="mt-1 text-muted-foreground">
                    {project?.created_by_username || "System"}
                  </div>
                </div>
                <div>
                  <Label htmlFor="lastRunBy">Last Run By</Label>
                  <div className="mt-1 text-muted-foreground">
                    {project?.lastRunBy_username ||
                      project?.lastRunBy ||
                      "Not available"}
                  </div>
                </div>
                <div>
                  <Label htmlFor="updatedAt">Updated At</Label>
                  <div className="mt-1 text-muted-foreground">
                    {formatDate(new Date(project.updatedAt))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Case Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test Case Statistics</CardTitle>
          <CardDescription>Overview of test cases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Test Cases</span>
              <span className="font-bold">{project.testCases.total}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                  <span className="text-sm">Passed</span>
                </div>
                <span>{project.testCases.passed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-3 w-3 rounded-full bg-red-500"></span>
                  <span className="text-sm">Failed</span>
                </div>
                <span>{project.testCases.failed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-3 w-3 rounded-full bg-yellow-500"></span>
                  <span className="text-sm">Pending</span>
                </div>
                <span>{project.testCases.pending}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Playwright Configuration Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Playwright Configuration</CardTitle>
          <CardDescription>Configure Playwright test settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="configuration" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
            </TabsList>

            {/* Combined Configuration */}
            <TabsContent value="configuration" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pw-baseURL">Base URL</Label>
                  <Input
                    id="pw-baseURL"
                    name="baseUrl"
                    className="mt-1"
                    placeholder={project.url}
                    value={playwrightConfig.baseUrl ?? ""}
                    onChange={(e) => handlePlaywrightConfigChange(e, "basic")}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Base URL to use for all page.goto() calls
                  </p>
                </div>
                <div>
                  <Label htmlFor="pw-testDir">Test Directory</Label>
                  <Input
                    id="pw-testDir"
                    name="pw-testDir"
                    className="mt-1"
                    placeholder="tests"
                    value={playwrightConfig.testDir}
                    onChange={(e) => handlePlaywrightConfigChange(e, "basic")}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Directory containing test files
                  </p>
                </div>
                <div>
                  <Label htmlFor="pw-retries">Retries</Label>
                  <Input
                    id="pw-retries"
                    name="pw-retries"
                    type="number"
                    min="0"
                    className="mt-1"
                    value={playwrightConfig.retries}
                    onChange={(e) => handlePlaywrightConfigChange(e, "basic")}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Number of retries when tests fail
                  </p>
                </div>
                <div>
                  <Label htmlFor="pw-workers">Workers</Label>
                  <Input
                    id="pw-workers"
                    name="pw-workers"
                    type="number"
                    min="1"
                    className="mt-1"
                    value={playwrightConfig.workers}
                    onChange={(e) => handlePlaywrightConfigChange(e, "basic")}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Number of parallel workers
                  </p>
                </div>
                <div>
                  <Label htmlFor="pw-timeout">Global Timeout (ms)</Label>
                  <Input
                    id="pw-timeout"
                    name="pw-timeout"
                    type="number"
                    min="0"
                    className="mt-1"
                    value={playwrightConfig.timeout}
                    onChange={(e) =>
                      handlePlaywrightConfigChange(e, "advanced")
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Maximum time for each test (milliseconds)
                  </p>
                </div>
                <div>
                  <Label htmlFor="pw-expect-timeout">Expect Timeout (ms)</Label>
                  <Input
                    id="pw-expect-timeout"
                    name="pw-expect-timeout"
                    type="number"
                    min="0"
                    className="mt-1"
                    value={playwrightConfig.expectTimeout}
                    onChange={(e) =>
                      handlePlaywrightConfigChange(e, "advanced")
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Maximum time for each assertion (milliseconds)
                  </p>
                </div>
                <div>
                  <Label htmlFor="pw-outputDir">Output Directory</Label>
                  <Input
                    id="pw-outputDir"
                    name="pw-outputDir"
                    className="mt-1"
                    value={playwrightConfig.outputDir}
                    onChange={(e) =>
                      handlePlaywrightConfigChange(e, "advanced")
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Directory for test results
                  </p>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="pw-fullyParallel"
                      className="h-4 w-4 rounded border-gray-300"
                      name="pw-fullyParallel"
                      checked={playwrightConfig.fullyParallel}
                      onChange={handlePlaywrightCheckboxChange}
                    />
                    <Label htmlFor="pw-fullyParallel">
                      Run all tests in parallel
                    </Label>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Run all tests in parallel
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end mt-6 space-x-2">
            <Button
              variant="outline"
              onClick={() => fetchPlaywrightConfig()}
              disabled={isSavingConfig}
            >
              Cancel
            </Button>
            <Button onClick={savePlaywrightConfig} disabled={isSavingConfig}>
              {isSavingConfig ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getDefaultExtension(reporterType: string): string {
  switch (reporterType) {
    case 'html':
      return 'playwright-report.html';
    case 'json':
      return 'test-results.json';
    case 'junit':
      return 'junit-results.xml';
    case 'dot':
      return 'dot-results.txt';
    case 'line':
      return 'line-results.txt';
    case 'list':
      return 'list-results.txt';
    default:
      return '';
  }
}
