"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { toast } from "sonner";
import {
  ShortcutTooltip,
  formatShortcut,
} from "@/components/ui/shortcut-tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export type RunTestMode = "single" | "all";

interface RunTestButtonProps {
  projectId: string;
  testCaseId?: string;
  mode?: RunTestMode;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  fullWidth?: boolean;
  showIcon?: boolean;
  showShortcut?: boolean;
  title?: string;
  onTestRunComplete?: (result: any) => void;
  onRefreshTestCases?: () => void;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function RunTestButton({
  projectId,
  testCaseId,
  mode = "single",
  variant = "default",
  size = "default",
  className = "",
  fullWidth = false,
  showIcon = true,
  showShortcut = false,
  title,
  onTestRunComplete,
  onRefreshTestCases,
  disabled = false,
  onClick,
}: RunTestButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [showBrowserDialog, setShowBrowserDialog] = useState(false);
  const [selectedBrowser, setSelectedBrowser] = useState<string>("chromium");
  const [headless, setHeadless] = useState<boolean>(true);
  const [showTestResult, setShowTestResult] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleRunTest = async () => {
    try {
      setIsRunning(true);
      setShowBrowserDialog(false);

      const payload =
        mode === "single" && testCaseId
          ? { testCaseId, browser: selectedBrowser, headless }
          : { browser: selectedBrowser, headless };

      console.log("Running test with browser:", selectedBrowser);

      const response = await fetch(`/api/projects/${projectId}/run-tests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text().catch(() => null);
        console.error(
          "Failed to run test. Status:",
          response.status,
          "Response:",
          errorData
        );
        throw new Error(
          `Could not run ${mode === "single" ? "test" : "tests"} - Status: ${
            response.status
          }${errorData ? " - " + errorData : ""}`
        );
      }

      const result = await response.json();
      setTestResult(result);
      setShowTestResult(true);

      if (result.success) {
        toast.success(
          mode === "single"
            ? "Test executed successfully"
            : "All tests executed successfully"
        );
      } else {
        toast.error(
          mode === "single"
            ? "Test failed"
            : "Some tests failed. Check results for details."
        );
      }

      // Handle result with callback if provided
      if (onTestRunComplete) {
        onTestRunComplete(result);
      }
    } catch (error) {
      console.error(
        `Error running ${mode === "single" ? "test" : "tests"}:`,
        error
      );
      toast.error(
        `Could not run ${
          mode === "single" ? "test" : "tests"
        }. Please try again later.`
      );
    } finally {
      setIsRunning(false);
    }
  };

  const buttonContent = () => {
    if (isRunning) {
      if (size === "icon") {
        return (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        );
      }
      return mode === "single" ? "Running test..." : "Running all tests...";
    }

    return (
      <>
        {showIcon && (
          <Play className={size === "icon" ? "h-4 w-4" : "mr-2 h-4 w-4"} />
        )}
        {size !== "icon" && (mode === "single" ? "Run Test" : "Run All Tests")}
      </>
    );
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={(e) => {
        if (onClick) onClick(e);
        setShowBrowserDialog(true);
      }}
      disabled={isRunning || disabled}
      className={`${fullWidth ? "w-full" : ""} ${className}`}
      data-test-id={
        mode === "single" ? "run-test-button" : "run-all-tests-button"
      }
      title={title}
    >
      {buttonContent()}
    </Button>
  );

  return (
    <>
      {showShortcut && mode === "single" ? (
        <ShortcutTooltip
          shortcut={formatShortcut("Ctrl+R")}
          description="Run test case"
        >
          {button}
        </ShortcutTooltip>
      ) : (
        button
      )}

      <Dialog open={showBrowserDialog} onOpenChange={setShowBrowserDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {mode === "single"
                ? "Select browser to run test"
                : "Select browser to run all tests"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="browser" className="text-right">
                Browser
              </Label>
              <Select
                value={selectedBrowser}
                onValueChange={setSelectedBrowser}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Choose browser" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chromium">Chromium</SelectItem>
                  <SelectItem value="firefox">Firefox</SelectItem>
                  <SelectItem value="webkit">WebKit (Safari)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="headless" className="text-right">
                Headless
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox
                  id="headless"
                  checked={headless}
                  onCheckedChange={(checked) => setHeadless(checked as boolean)}
                />
                <label
                  htmlFor="headless"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Hide browser when running test
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowBrowserDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleRunTest} disabled={isRunning}>
              {isRunning
                ? mode === "single"
                  ? "Running test..."
                  : "Running all tests..."
                : mode === "single"
                ? "Run Test"
                : "Run All Tests"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showTestResult}
        onOpenChange={(open) => {
          setShowTestResult(open);
          if (!open) {
            // Only refresh when dialog is closed
            if (onRefreshTestCases) {
              onRefreshTestCases();
            } else {
              window.location.reload();
            }
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Results</DialogTitle>
          </DialogHeader>

          {testResult ? (
            <div className="py-4 space-y-4">
              <div
                className={`p-3 rounded-md ${
                  testResult.success ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <p
                  className={
                    testResult.success ? "text-green-700" : "text-red-700"
                  }
                >
                  {testResult.success
                    ? "✅ Test executed successfully"
                    : "❌ Test failed"}
                </p>
                {testResult.duration && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Runtime: {(testResult.duration / 1000).toFixed(2)}s
                  </p>
                )}
              </div>

              {/* Tab control */}
              <Tabs defaultValue="results" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="results">Test Results & Recording</TabsTrigger>
                  <TabsTrigger value="logs">Log Output</TabsTrigger>
                </TabsList>
                
                <TabsContent value="results" className="space-y-4 mt-4">
                  {/* Test Results Details */}
                  {testResult.testResults && (
                    <div className="border rounded-md p-4 space-y-3">
                      <h3 className="font-medium">Result Details:</h3>
                      {testResult.testResults.stats && (
                        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                          <div className="bg-blue-50 p-2 rounded-md">
                            <div className="text-lg font-semibold">
                              {testResult.testResults.stats.expected +
                                testResult.testResults.stats.unexpected || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Total Tests
                            </div>
                          </div>
                          <div className="bg-green-50 p-2 rounded-md">
                            <div className="text-lg font-semibold text-green-600">
                              {testResult.testResults.stats.expected || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Passed
                            </div>
                          </div>
                          <div className="bg-red-50 p-2 rounded-md">
                            <div className="text-lg font-semibold text-red-600">
                              {testResult.testResults.stats.unexpected || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Failed
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show video if available */}
                      {testResult.videoUrl && (
                        <div className="space-y-2">
                          <h3 className="font-medium">Test Recording:</h3>
                          <div className="border rounded-md overflow-hidden">
                            <video 
                              src={testResult.videoUrl.startsWith('http') ? testResult.videoUrl : `/videos/${testResult.videoUrl}`}
                              controls
                              className="w-full h-auto"
                            >
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="logs" className="mt-4">
                  {/* Output logs */}
                  {testResult.output && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Log Output:</h3>
                      <div className="bg-gray-50 p-4 rounded-md h-[300px] overflow-auto text-sm">
                        {testResult.output
                          .split("\n")
                          .map((line: string, i: number) => (
                            <div
                              key={i}
                              className={`font-mono ${
                                line.includes("Error") ||
                                line.includes("error") ||
                                line.includes("fail") ||
                                line.includes("Fail")
                                  ? "text-red-500"
                                  : line.includes("pass") ||
                                    line.includes("Pass") ||
                                    line.includes("success") ||
                                    line.includes("Success")
                                  ? "text-green-500"
                                  : ""
                              }`}
                            >
                              {line}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="py-8 flex justify-center">
              <p className="text-muted-foreground">No test results available</p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowTestResult(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
