"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Play,
  AlertCircle,
  CheckCircle,
  XCircle,
  Camera,
  Clock,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermission } from "@/lib/hooks/usePermission";

// Định nghĩa kiểu cho test case
interface TestCase {
  id: string;
  name: string;
  description: string;
  status: string;
  isManual: boolean;
  steps: TestStep[];
}

// Định nghĩa kiểu cho test step
interface TestStep {
  id: string;
  order: number;
  description: string;
  expectedResult: string;
  notes?: string;
}

// Định nghĩa kiểu cho kết quả chạy test
interface TestRunResult {
  id: string;
  testCaseId: string;
  status: string;
  startedAt: string;
  completedAt: string;
  results: TestStepResult[];
  videoUrl?: string;
  duration?: number;
}

// Định nghĩa kiểu cho kết quả bước test
interface TestStepResult {
  id: string;
  testStepId: string;
  status: string;
  notes?: string;
  screenshot?: string;
}

export default function RunTestCasePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const testCaseId = params.testCaseId as string;
  const { hasPermission } = usePermission();

  // State cho test case và bước test
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepResults, setStepResults] = useState<{[key: string]: {status: string; notes: string}}>({});
  const [isRunning, setIsRunning] = useState(false);
  const [runCompleted, setRunCompleted] = useState(false);
  const [testRunId, setTestRunId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<TestRunResult | null>(null);

  // Browser options
  const [selectedBrowser, setSelectedBrowser] = useState("chromium");
  const [headless, setHeadless] = useState(true);
  const [screenshot, setScreenshot] = useState("only-on-failure");
  const [video, setVideo] = useState("on-first-retry");
  
  // Fetch test case data when component mounts
  useEffect(() => {
    // Kiểm tra quyền ngay khi component được tải
    if (!hasPermission("testcase.run")) {
      toast.error("You don't have permission to run test cases");
      router.push(`/projects/${projectId}/test-cases/${testCaseId}`);
      return;
    }

    async function fetchTestCase() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/projects/${projectId}/test-cases/${testCaseId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Test case not found");
          } else {
            throw new Error("Failed to fetch test case");
          }
          return;
        }
        
        const data = await response.json();
        setTestCase(data);
        
        // Initialize step results
        if (data.steps && data.steps.length > 0) {
          const initialResults: {[key: string]: {status: string; notes: string}} = {};
          data.steps.forEach((step: TestStep) => {
            initialResults[step.id] = { status: 'pending', notes: '' };
          });
          setStepResults(initialResults);
        }
      } catch (error) {
        console.error("Error fetching test case:", error);
        setError("An error occurred while fetching the test case");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTestCase();
  }, [projectId, testCaseId, router, hasPermission]);

  // Handle step result update
  const updateStepResult = (stepId: string, status: string, notes: string = '') => {
    setStepResults(prev => ({
      ...prev,
      [stepId]: { status, notes }
    }));
  };
  
  // Start automated test run
  const runAutomatedTest = async () => {
    if (!testCase) return;
    
    try {
      setIsRunning(true);
      setRunCompleted(false);
      setError(null);
      
      // Reset all step results to pending
      const initialResults: {[key: string]: {status: string; notes: string}} = {};
      testCase.steps.forEach(step => {
        initialResults[step.id] = { status: 'pending', notes: '' };
      });
      setStepResults(initialResults);
      
      // Call API to run the test
      const response = await fetch(`/api/projects/${projectId}/test-cases/${testCaseId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          browser: selectedBrowser,
          headless,
          screenshot,
          video
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to run test");
      }
      
      const result = await response.json();
      setTestRunId(result.id);
      
      // Poll for results
      pollForResults(result.id);
      
    } catch (error) {
      console.error("Error running test:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
      setIsRunning(false);
    }
  };
  
  // Submit manual test run
  const submitManualRun = async () => {
    if (!testCase) return;
    
    try {
      setIsRunning(true);
      
      // Check if all steps have a status
      const allStepsHaveStatus = testCase.steps.every(step => 
        stepResults[step.id] && stepResults[step.id].status !== 'pending'
      );
      
      if (!allStepsHaveStatus) {
        toast.warning("Please provide a result for all test steps");
        setIsRunning(false);
        return;
      }
      
      // Format step results for API
      const formattedResults = Object.entries(stepResults).map(([stepId, result]) => ({
        testStepId: stepId,
        status: result.status,
        notes: result.notes || ''
      }));
      
      // Call API to submit results
      const response = await fetch(`/api/projects/${projectId}/test-cases/${testCaseId}/run/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          results: formattedResults
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit test results");
      }
      
      const result = await response.json();
      setRunResult(result);
      setRunCompleted(true);
      toast.success("Test results submitted successfully");
      
    } catch (error) {
      console.error("Error submitting test results:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsRunning(false);
    }
  };
  
  // Poll for automated test results
  const pollForResults = async (runId: string) => {
    try {
      const checkStatus = async () => {
        const response = await fetch(`/api/projects/${projectId}/test-cases/${testCaseId}/run/${runId}`);
        
        if (!response.ok) {
          throw new Error("Failed to check test run status");
        }
        
        const result = await response.json();
        
        if (result.status === 'completed' || result.status === 'failed') {
          setRunResult(result);
          setRunCompleted(true);
          setIsRunning(false);
          
          // Update step results based on the response
          if (result.results) {
            const updatedResults: {[key: string]: {status: string; notes: string}} = {};
            result.results.forEach((res: TestStepResult) => {
              updatedResults[res.testStepId] = { 
                status: res.status, 
                notes: res.notes || '' 
              };
            });
            setStepResults(updatedResults);
          }
          
          if (result.status === 'completed') {
            toast.success("Test run completed successfully");
          } else {
            toast.error("Test run failed");
          }
        } else {
          // Continue polling
          setTimeout(checkStatus, 2000);
        }
      };
      
      checkStatus();
    } catch (error) {
      console.error("Error polling for test results:", error);
      setError(error instanceof Error ? error.message : "Failed to get test results");
      setIsRunning(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading test case...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline">
              <Link href={`/projects/${projectId}/test-cases/${testCaseId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Test Case
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (!testCase) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Case Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested test case could not be found.</p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline">
              <Link href={`/projects/${projectId}/test-cases`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Test Cases
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Run Test Case</h1>
          <p className="text-muted-foreground">{testCase.name}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/projects/${projectId}/test-cases/${testCaseId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Test Case
          </Link>
        </Button>
      </div>
      
      {runCompleted && runResult ? (
        <Card className="mb-6">
          <CardHeader className={`${runResult.status === 'completed' ? 'bg-green-50' : 'bg-red-50'}`}>
            <CardTitle className="flex items-center gap-2">
              {runResult.status === 'completed' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-600">Test Run Completed</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-600">Test Run Failed</span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              {runResult.startedAt && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Started: {new Date(runResult.startedAt).toLocaleString()}
                </span>
              )}
              {runResult.duration && (
                <span className="text-muted-foreground ml-4">
                  Duration: {(runResult.duration / 1000).toFixed(1)}s
                </span>
              )}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            <Tabs defaultValue="results">
              <TabsList className="mb-4">
                <TabsTrigger value="results">Results</TabsTrigger>
                {runResult.videoUrl && <TabsTrigger value="recording">Recording</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="results">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Test Steps Results</h3>
                  <div className="border rounded-md divide-y">
                    {testCase.steps.map((step, index) => {
                      const result = stepResults[step.id] || { status: 'pending', notes: '' };
                      return (
                        <div key={step.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="font-medium">Step {step.order}: {step.description}</p>
                              <p className="text-sm text-muted-foreground">Expected: {step.expectedResult}</p>
                            </div>
                            <Badge 
                              variant={
                                result.status === 'passed' ? 'secondary' : 
                                result.status === 'failed' ? 'destructive' : 'outline'
                              }
                            >
                              {result.status.toUpperCase()}
                            </Badge>
                          </div>
                          
                          {result.notes && (
                            <div className="mt-2 text-sm bg-muted p-2 rounded-md">
                              <p className="font-medium">Notes:</p>
                              <p>{result.notes}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
              
              {runResult.videoUrl && (
                <TabsContent value="recording">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Test Recording</h3>
                    <div className="border rounded-md p-4">
                      <video 
                        controls 
                        src={`/videos/${runResult.videoUrl}`} 
                        className="w-full rounded-md"
                      />
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
          
          <CardFooter>
            <Button 
              onClick={testCase.isManual ? submitManualRun : runAutomatedTest}
              disabled={isRunning}
            >
              <Play className="mr-2 h-4 w-4" />
              Run Again
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          {testCase.isManual ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Manual Test Execution</CardTitle>
                <CardDescription>
                  Execute this test case manually and record the results for each step
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="space-y-6">
                  {testCase.steps.map((step, index) => {
                    const result = stepResults[step.id] || { status: 'pending', notes: '' };
                    return (
                      <div key={step.id} className="border rounded-md p-4">
                        <div className="space-y-2 mb-4">
                          <h3 className="font-medium">Step {step.order}: {step.description}</h3>
                          <p className="text-sm text-muted-foreground">Expected Result: {step.expectedResult}</p>
                          {step.notes && (
                            <p className="text-sm italic">Notes: {step.notes}</p>
                          )}
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Result:</h4>
                            <RadioGroup 
                              value={result.status} 
                              onValueChange={(value) => updateStepResult(step.id, value, result.notes)}
                              className="flex space-x-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="passed" id={`passed-${step.id}`} />
                                <Label htmlFor={`passed-${step.id}`} className="text-green-600">Passed</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="failed" id={`failed-${step.id}`} />
                                <Label htmlFor={`failed-${step.id}`} className="text-red-600">Failed</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="skipped" id={`skipped-${step.id}`} />
                                <Label htmlFor={`skipped-${step.id}`} className="text-amber-600">Skipped</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Notes:</h4>
                            <textarea
                              value={result.notes}
                              onChange={(e) => updateStepResult(step.id, result.status, e.target.value)}
                              className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                              placeholder="Add notes about this step's execution..."
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  onClick={submitManualRun} 
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Submit Results
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Automated Test Execution</CardTitle>
                <CardDescription>
                  Configure and run the automated test for this test case
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Browser Settings</h3>
                    
                    <div className="space-y-2">
                      <Label>Browser</Label>
                      <RadioGroup 
                        value={selectedBrowser} 
                        onValueChange={setSelectedBrowser}
                        className="flex flex-wrap gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="chromium" id="browser-chromium" />
                          <Label htmlFor="browser-chromium">Chromium</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="firefox" id="browser-firefox" />
                          <Label htmlFor="browser-firefox">Firefox</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="webkit" id="browser-webkit" />
                          <Label htmlFor="browser-webkit">WebKit</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="headless" 
                        checked={headless}
                        onCheckedChange={(checked) => setHeadless(checked === true)}
                      />
                      <Label htmlFor="headless">Run in headless mode</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Recording Options</h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        <Label>Screenshots</Label>
                      </div>
                      <RadioGroup 
                        value={screenshot} 
                        onValueChange={setScreenshot}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="only-on-failure" id="screenshot-failure" />
                          <Label htmlFor="screenshot-failure">Only on failure</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="on" id="screenshot-on" />
                          <Label htmlFor="screenshot-on">Take screenshots on each step</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="off" id="screenshot-off" />
                          <Label htmlFor="screenshot-off">Don't take screenshots</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        <Label>Video</Label>
                      </div>
                      <RadioGroup 
                        value={video} 
                        onValueChange={setVideo}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="on-first-retry" id="video-retry" />
                          <Label htmlFor="video-retry">Record on first retry</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="on" id="video-on" />
                          <Label htmlFor="video-on">Always record</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="off" id="video-off" />
                          <Label htmlFor="video-off">Don't record</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Test Steps</h3>
                    <div className="border rounded-md divide-y">
                      {testCase.steps.map((step, index) => (
                        <div key={step.id} className="p-4">
                          <p className="font-medium">Step {step.order}: {step.description}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Expected: {step.expectedResult}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  onClick={runAutomatedTest}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Running Test...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run Test
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </>
      )}
    </div>
  );
} 