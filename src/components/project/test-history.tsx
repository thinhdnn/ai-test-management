import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface TestHistoryProps {
  projectId: string;
}

export function TestHistory({ projectId }: TestHistoryProps) {
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 20,
  });

  // Filters
  const [selectedTestCase, setSelectedTestCase] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<any[]>([]);

  // Test result details
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [showResultDetail, setShowResultDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load test cases for filter
  useEffect(() => {
    const fetchTestCases = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/test-cases`);
        if (response.ok) {
          const data = await response.json();
          setTestCases(data);
        }
      } catch (error) {
        console.error("Error fetching test cases:", error);
      }
    };

    fetchTestCases();
  }, [projectId]);

  // Load test execution history
  const fetchTestHistory = async (
    page = 1,
    testCaseId: string | null = null
  ) => {
    try {
      setLoading(true);
      let url = `/api/projects/${projectId}/test-history?page=${page}`;
      if (testCaseId) {
        url += `&testCaseId=${testCaseId}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch test history");
      }

      const data = await response.json();
      setTestHistory(data.data);
      setPagination(data.pagination);

      if (data.message && data.message.includes("migration")) {
        setMigrationMessage(data.message);
      } else {
        setMigrationMessage(null);
      }

      setError(null);
    } catch (err) {
      console.error(err);
      setError("Error loading test history");
    } finally {
      setLoading(false);
    }
  };

  // Load history when component mounts or filter changes
  useEffect(() => {
    fetchTestHistory(1, selectedTestCase);
  }, [projectId, selectedTestCase]);

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchTestHistory(page, selectedTestCase);
  };

  // Handle test case filter change
  const handleTestCaseFilterChange = (value: string) => {
    setSelectedTestCase(
      value === "all" ? null : value === "project-level" ? "" : value
    );
  };

  // View test result details
  const handleViewResultDetail = async (resultId: string) => {
    try {
      setLoadingDetail(true);
      const response = await fetch(
        `/api/projects/${projectId}/test-history/${resultId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch test result details");
      }

      const data = await response.json();
      setSelectedResult(data);
      setShowResultDetail(true);
    } catch (error) {
      console.error("Error fetching test result details:", error);
      toast.error("Failed to load test result details");
    } finally {
      setLoadingDetail(false);
    }
  };

  if (loading && testHistory.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading test history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Test Execution History</h2>
        <div className="flex items-center space-x-2">
          <Label htmlFor="testCaseFilter" className="mr-2">
            Filter by Test Case:
          </Label>
          <Select
            value={selectedTestCase || "all"}
            onValueChange={handleTestCaseFilterChange}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All Test Cases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Test Cases</SelectItem>
              <SelectItem value="project-level">Project-level Tests</SelectItem>
              {testCases.map((testCase) => (
                <SelectItem key={testCase.id} value={testCase.id}>
                  {testCase.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              fetchTestHistory(pagination.currentPage, selectedTestCase)
            }
          >
            Refresh
          </Button>
        </div>
      </div>

      {migrationMessage && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {migrationMessage}
                <br />
                <span className="font-medium mt-1 block">
                  To use this feature, run the following command in your
                  terminal:
                  <code className="bg-gray-100 text-sm p-1 ml-2 rounded">
                    npx prisma migrate dev --name add_test_history
                  </code>
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {testHistory.length === 0 && !loading && !error ? (
        <div className="text-center py-12 border rounded-md">
          <p className="text-muted-foreground">
            {migrationMessage
              ? "Test history feature is not activated"
              : "No test execution history found"}
          </p>
        </div>
      ) : (
        <>
          {!migrationMessage && (
            <>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium">
                          Date/Time
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Test Case
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Browser
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Run By
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Duration
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {testHistory.map((record) => (
                        <tr
                          key={record.id}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="px-4 py-2 whitespace-nowrap">
                            {formatDate(new Date(record.createdAt))}
                          </td>
                          <td className="px-4 py-2">{record.testCaseName}</td>
                          <td className="px-4 py-2">
                            <div
                              className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                                record.success
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                              }`}
                            >
                              {record.success ? "Passed" : "Failed"}
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap capitalize">
                            {record.browser || "N/A"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {record.lastRunBy_username || "N/A"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {record.executionTime
                              ? `${(record.executionTime / 1000).toFixed(2)}s`
                              : "N/A"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewResultDetail(record.id)}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Phân trang */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.currentPage === 1}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    Last
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Test Result Details Dialog */}
      <Dialog open={showResultDetail} onOpenChange={setShowResultDetail}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Test Result Details
              {selectedResult?.testCaseName &&
                `: ${selectedResult.testCaseName}`}
            </DialogTitle>
            <DialogDescription>
              {selectedResult?.createdAt &&
                formatDate(new Date(selectedResult.createdAt))}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="py-8 flex justify-center">
              <p className="text-muted-foreground">Loading result details...</p>
            </div>
          ) : selectedResult ? (
            <div className="py-4 space-y-4">
              <div
                className={`p-3 rounded-md ${
                  selectedResult.success ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <p
                  className={
                    selectedResult.success ? "text-green-700" : "text-red-700"
                  }
                >
                  {selectedResult.success
                    ? "✅ Test executed successfully"
                    : "❌ Test failed"}
                </p>
                <div className="flex justify-between mt-1">
                  <p className="text-sm text-muted-foreground">
                    {selectedResult.executionTime && (
                      <>
                        Runtime:{" "}
                        {(selectedResult.executionTime / 1000).toFixed(2)}s
                      </>
                    )}
                  </p>
                  {selectedResult.browser && (
                    <p className="text-sm text-muted-foreground capitalize">
                      Browser: {selectedResult.browser}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Tab control */}
              <Tabs defaultValue="results" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="results">Test Results & Recording</TabsTrigger>
                  <TabsTrigger value="logs">Log Output</TabsTrigger>
                </TabsList>
                
                <TabsContent value="results" className="space-y-4 mt-4">
                  {/* Test Results Details */}
                  {selectedResult.resultData && (
                    <div className="border rounded-md p-4 space-y-3">
                      <h3 className="font-medium">Result Details:</h3>
                      {(() => {
                        try {
                          const resultData = typeof selectedResult.resultData === 'string' 
                            ? JSON.parse(selectedResult.resultData)
                            : selectedResult.resultData;
                          
                          return (
                            resultData.stats && (
                              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                                <div className="bg-blue-50 p-2 rounded-md">
                                  <div className="text-lg font-semibold">
                                    {resultData.stats.expected +
                                      resultData.stats.unexpected || 0}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Total Tests
                                  </div>
                                </div>
                                <div className="bg-green-50 p-2 rounded-md">
                                  <div className="text-lg font-semibold text-green-600">
                                    {resultData.stats.expected || 0}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Passed
                                  </div>
                                </div>
                                <div className="bg-red-50 p-2 rounded-md">
                                  <div className="text-lg font-semibold text-red-600">
                                    {resultData.stats.unexpected || 0}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Failed
                                  </div>
                                </div>
                              </div>
                            )
                          );
                        } catch (e) {
                          return (
                            <p className="text-sm text-muted-foreground">
                              Could not parse test result data
                            </p>
                          );
                        }
                      })()}
                    </div>
                  )}

                  {/* Show video if available */}
                  {selectedResult.videoUrl && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Test Recording:</h3>
                      <div className="border rounded-md overflow-hidden">
                        <video 
                          src={selectedResult.videoUrl.startsWith('http') ? selectedResult.videoUrl : `/videos/${selectedResult.videoUrl}`}
                          controls
                          className="w-full h-auto"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="logs" className="mt-4">
                  {/* Output logs */}
                  {selectedResult.output && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Log Output:</h3>
                      <div className="bg-gray-50 p-4 rounded-md h-[400px] overflow-auto text-sm">
                        {selectedResult.output
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
                  
                  {/* Show error message if present */}
                  {selectedResult.errorMessage && !selectedResult.output && (
                    <div className="space-y-2">
                      <h3 className="font-medium text-red-500">Error:</h3>
                      <div className="bg-red-50 p-4 rounded-md overflow-auto text-sm">
                        <div className="font-mono text-red-500">
                          {selectedResult.errorMessage}
                        </div>
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
            <Button onClick={() => setShowResultDetail(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
