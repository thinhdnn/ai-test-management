"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Save,
  FileCode,
  PlayCircle,
  Info,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { toValidFileName } from "@/lib/utils";

interface PlaywrightTestCase {
  filePath: string;
  content: string;
}

interface TestCase {
  id: string;
  name: string;
  description?: string;
}

export default function PlaywrightTestCasePage() {
  const params = useParams<{ id: string; testCaseId: string }>();
  const [playwrightTest, setPlaywrightTest] =
    useState<PlaywrightTestCase | null>(null);
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [testContent, setTestContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{
    success: boolean;
    output: string;
    duration?: number;
    steps?: any[];
    testResults?: {
      stats?: any;
      suites?: any[];
    };
    screenshots?: string[];
    error?: string;
  } | null>(null);
  const [showFullOutput, setShowFullOutput] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch test case info
        const testCaseResponse = await fetch(
          `/api/projects/${params.id}/test-cases/${params.testCaseId}`
        );

        if (!testCaseResponse.ok) {
          throw new Error("Unable to load test case information");
        }

        const testCaseData = await testCaseResponse.json();
        setTestCase(testCaseData);

        // Fetch playwright test file
        const playwrightResponse = await fetch(
          `/api/projects/${params.id}/test-cases/${params.testCaseId}/playwright`
        );

        if (!playwrightResponse.ok) {
          throw new Error("Unable to load Playwright test file");
        }

        const playwrightData = await playwrightResponse.json();
        setPlaywrightTest(playwrightData);
        setTestContent(playwrightData.content);
        setError(null);
      } catch (err) {
        console.error("Error loading data:", err);
        setError(
          "Unable to load Playwright test file. Please check project configuration."
        );
      } finally {
        setLoading(false);
      }
    }

    if (params.id && params.testCaseId) {
      fetchData();
    }
  }, [params.id, params.testCaseId]);

  const handleSave = async () => {
    if (!playwrightTest) return;

    try {
      setSaving(true);
      const response = await fetch(
        `/api/projects/${params.id}/test-cases/${params.testCaseId}/playwright`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: testContent }),
        }
      );

      if (!response.ok) {
        throw new Error("Unable to save test file");
      }

      toast.success("Playwright test file saved successfully");
    } catch (err) {
      console.error("Error saving test file:", err);
      toast.error("Unable to save test file. Please try again later.");
    } finally {
      setSaving(false);
    }
  };

  const handleRunTest = async () => {
    try {
      setRunning(true);
      setRunResult(null);

      const response = await fetch(`/api/projects/${params.id}/run-tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testCaseId: params.testCaseId }),
      });

      if (!response.ok) {
        throw new Error("Unable to run test");
      }

      const data = await response.json();
      setRunResult(data);

      if (data.success) {
        toast.success("Test executed successfully");
      } else {
        toast.error("Test failed. See details in results.");
      }
    } catch (err) {
      console.error("Error running test:", err);
      toast.error("Unable to run test. Please try again later.");
    } finally {
      setRunning(false);
    }
  };

  // Calculate file name from test case name
  const testFileName = testCase
    ? `${toValidFileName(testCase.name)}.spec.ts`
    : "";

  return (
    <div className="container px-4 py-6 sm:px-6 md:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Playwright Test Case
          </h1>
          <p className="text-muted-foreground">
            Edit and run Playwright test case directly from the interface
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link
              href={`/projects/${params.id}/test-cases/${params.testCaseId}`}
            >
              Back to Test Case
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-600">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {testCase && (
            <Card className="bg-muted/40">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-medium">Test case information</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      Name:{" "}
                      <span className="font-medium text-foreground">
                        {testCase.name}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      File name:{" "}
                      <span className="font-medium text-foreground font-mono">
                        {testFileName}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {playwrightTest && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <FileCode className="h-5 w-5" />
                    <span>
                      Test File:{" "}
                      <span className="font-mono text-sm">{testFileName}</span>
                    </span>
                  </div>
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRunTest}
                    disabled={running}
                    className="flex items-center gap-2"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {running ? "Running..." : "Run Test"}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="editor">
                  <TabsList className="mb-4">
                    <TabsTrigger value="editor">Editor</TabsTrigger>
                    <TabsTrigger value="result">Test Results</TabsTrigger>
                  </TabsList>
                  <TabsContent value="editor">
                    <Textarea
                      className="font-mono h-[500px] resize-none"
                      value={testContent}
                      onChange={(e) => setTestContent(e.target.value)}
                    />
                  </TabsContent>
                  <TabsContent value="result">
                    {runResult ? (
                      <div className="space-y-4">
                        <div
                          className={`p-3 rounded-md ${
                            runResult.success ? "bg-green-50" : "bg-red-50"
                          }`}
                        >
                          <p
                            className={
                              runResult.success
                                ? "text-green-700"
                                : "text-red-700"
                            }
                          >
                            {runResult.success
                              ? "✅ Test executed successfully"
                              : "❌ Test failed"}
                          </p>
                          {runResult.duration && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Runtime: {(runResult.duration / 1000).toFixed(2)}s
                            </p>
                          )}
                        </div>

                        {/* Hiển thị test details nếu có */}
                        {runResult.testResults && (
                          <div className="border rounded-md p-4 space-y-3">
                            <h3 className="font-medium">Result Details:</h3>

                            {/* Hiển thị thông tin tổng quan */}
                            {runResult.testResults.stats && (
                              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                                <div className="bg-blue-50 p-2 rounded-md">
                                  <div className="text-lg font-semibold">
                                    {runResult.testResults.stats.expected +
                                      runResult.testResults.stats.unexpected ||
                                      0}
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
                                    {runResult.testResults.stats.unexpected ||
                                      0}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Failed
                                  </div>
                                </div>
                              </div>
                            )}

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

                                        {suite.specs &&
                                          suite.specs.length > 0 && (
                                            <div className="mt-2 pl-2">
                                              {suite.specs.map(
                                                (
                                                  spec: any,
                                                  specIndex: number
                                                ) => (
                                                  <div
                                                    key={specIndex}
                                                    className="mb-2"
                                                  >
                                                    <div className="font-medium text-sm">
                                                      {spec.title ||
                                                        "Test Spec"}
                                                    </div>

                                                    {/* Hiển thị rõ ràng trạng thái của spec */}
                                                    <div className="text-xs text-muted-foreground mb-1">
                                                      Status:{" "}
                                                      <span
                                                        className={
                                                          spec.ok
                                                            ? "text-green-600"
                                                            : "text-red-600"
                                                        }
                                                      >
                                                        {spec.ok
                                                          ? "Passed"
                                                          : "Failed"}
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
                                                                    {test.error
                                                                      .message ||
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

                        {/* Hiển thị steps nếu có */}
                        {runResult.steps && runResult.steps.length > 0 && (
                          <div className="border rounded-md p-4 space-y-3">
                            <h3 className="font-medium">Step Details:</h3>
                            <div className="divide-y">
                              {runResult.steps.map(
                                (step: any, index: number) => (
                                  <div key={index} className="py-2">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium">
                                        {index + 1}. {step.action}
                                      </span>
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                          step.success
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                        }`}
                                      >
                                        {step.success ? "Passed" : "Failed"}
                                      </span>
                                    </div>
                                    {step.data && (
                                      <div className="mt-1 text-sm text-muted-foreground">
                                        Data: {step.data}
                                      </div>
                                    )}
                                    {step.error && (
                                      <div className="mt-1 text-sm text-red-500">
                                        Error: {step.error}
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">Log Output:</h3>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowFullOutput((prev) => !prev)}
                              className="text-xs flex items-center gap-1"
                            >
                              {showFullOutput ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Collapse
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  Expand
                                </>
                              )}
                            </Button>
                          </div>
                          <div
                            className={`bg-gray-50 p-4 rounded-md ${
                              showFullOutput ? "h-[400px]" : "h-[150px]"
                            } overflow-auto text-sm transition-all duration-300`}
                          >
                            {runResult.output &&
                              runResult.output
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
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <p>No test results yet. Run the test to see results.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
