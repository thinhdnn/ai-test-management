"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RunTestButton } from "@/components/run-test-button";

export function RunAllTestsButton({ projectId }: { projectId: string }) {
  const [showResult, setShowResult] = useState(false);
  const [runResult, setRunResult] = useState<{
    success: boolean;
    output: string;
    duration?: number;
    testResults?: {
      stats: any;
      suites: any[];
      success: boolean;
    };
  } | null>(null);

  const refreshTestCases = async () => {
    try {
      const event = new CustomEvent("refreshTestCases");
      document.dispatchEvent(event);
      toast.success("Test status refreshed");
    } catch (error) {
      console.error("Error refreshing test status:", error);
      toast.error("Failed to refresh test status");
    }
  };

  return (
    <>
      <RunTestButton
        projectId={projectId}
        mode="all"
        size="sm"
        showIcon={true}
        onTestRunComplete={(result) => {
          setRunResult(result);
          setShowResult(true);
        }}
        onRefreshTestCases={refreshTestCases}
      />

      {/* Results dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Results</DialogTitle>
            <DialogDescription>
              Results from running all tests in the project
            </DialogDescription>
          </DialogHeader>

          {runResult ? (
            <div className="py-4 space-y-4">
              <div
                className={`p-3 rounded-md ${
                  runResult.success ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <p
                  className={
                    runResult.success ? "text-green-700" : "text-red-700"
                  }
                >
                  {runResult.success
                    ? "✅ All tests executed successfully"
                    : "❌ Some tests failed"}
                </p>
                {runResult.duration && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Runtime: {(runResult.duration / 1000).toFixed(2)}s
                  </p>
                )}
              </div>

              {/* Show formatted test results if available */}
              {runResult.testResults && (
                <div className="border rounded-md p-4 space-y-3">
                  <h3 className="font-medium">Result Details:</h3>
                  {/* Summary stats */}
                  {runResult.testResults.stats && (
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div className="bg-blue-50 p-2 rounded-md">
                        <div className="text-lg font-semibold">
                          {runResult.testResults.stats.expected +
                            runResult.testResults.stats.unexpected || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total Tests
                        </div>
                      </div>
                      <div className="bg-green-50 p-2 rounded-md">
                        <div className="text-lg font-semibold text-green-600">
                          {runResult.testResults.stats.expected || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Passed
                        </div>
                      </div>
                      <div className="bg-red-50 p-2 rounded-md">
                        <div className="text-lg font-semibold text-red-600">
                          {runResult.testResults.stats.unexpected || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Failed
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test Details */}
                  {runResult.testResults.suites &&
                    runResult.testResults.suites.length > 0 && (
                      <div className="space-y-3">
                        {runResult.testResults.suites.map(
                          (suite: any, suiteIndex: number) => (
                            <div
                              key={suiteIndex}
                              className="border-l-4 border-blue-400 pl-3 py-1"
                            >
                              <div className="font-medium">
                                {suite.title || "Test Suite"}
                              </div>

                              {suite.specs && suite.specs.length > 0 && (
                                <div className="mt-2 pl-2">
                                  {suite.specs.map(
                                    (spec: any, specIndex: number) => (
                                      <div key={specIndex} className="mb-2">
                                        <div className="font-medium text-sm">
                                          {spec.title || "Test Spec"}
                                        </div>

                                        {/* Display spec status clearly */}
                                        <div className="text-xs text-muted-foreground mb-1">
                                          Status:{" "}
                                          <span
                                            className={
                                              spec.ok
                                                ? "text-green-600"
                                                : "text-red-600"
                                            }
                                          >
                                            {spec.ok ? "Passed" : "Failed"}
                                          </span>
                                        </div>

                                        {spec.tests &&
                                          spec.tests.length > 0 && (
                                            <div className="pl-2 mt-1 space-y-2">
                                              {spec.tests.map(
                                                (
                                                  test: any,
                                                  testIndex: number
                                                ) => (
                                                  <div
                                                    key={testIndex}
                                                    className={`p-2 rounded-md ${
                                                      test.status ===
                                                        "passed" ||
                                                      test.status ===
                                                        "expected" ||
                                                      test.passed
                                                        ? "bg-green-50"
                                                        : "bg-red-50"
                                                    }`}
                                                  >
                                                    <div className="text-xs text-muted-foreground mb-1">
                                                      <span className="font-medium">
                                                        Test Step
                                                      </span>
                                                    </div>

                                                    <div className="flex justify-between items-center">
                                                      <span className="text-sm">
                                                        {test.title ||
                                                          "Test Case"}
                                                      </span>
                                                      <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                          test.status ===
                                                            "passed" ||
                                                          test.status ===
                                                            "expected" ||
                                                          test.passed
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-red-100 text-red-800"
                                                        }`}
                                                      >
                                                        {test.status ===
                                                          "passed" ||
                                                        test.status ===
                                                          "expected" ||
                                                        test.passed
                                                          ? "Passed"
                                                          : "Failed"}
                                                      </span>
                                                    </div>

                                                    {test.error && (
                                                      <div className="mt-2 text-red-600 text-xs p-2 bg-red-50 rounded overflow-x-auto">
                                                        {test.error.message ||
                                                          test.error}
                                                      </div>
                                                    )}
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          )}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* Output logs */}
              {runResult.output && (
                <div className="space-y-2">
                  <h3 className="font-medium">Log Output:</h3>
                  <div className="bg-gray-50 p-4 rounded-md h-[150px] overflow-auto text-sm">
                    {runResult.output
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
            </div>
          ) : (
            <div className="py-8 flex justify-center">
              <p className="text-muted-foreground">No test results available</p>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={refreshTestCases}>
              Refresh Status
            </Button>
            <Button onClick={() => setShowResult(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
