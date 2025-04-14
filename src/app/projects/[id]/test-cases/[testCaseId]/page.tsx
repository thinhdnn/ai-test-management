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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  MoreHorizontal,
  Play,
  Plus,
  Trash,
  Save,
  Clock,
  Tag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Check,
  X,
  RotateCcw,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { STATUS_OPTIONS, cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePermission } from "@/lib/hooks/usePermission";

// Test case type definition
interface TestCase {
  id: string;
  name: string;
  description: string;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastRun: string | null;
  lastRunStatus: string | null;
  isManual: boolean;
  steps: TestStep[];
  projectId: string;
}

// Test step type definition
interface TestStep {
  id: string;
  testCaseId: string;
  order: number;
  description: string;
  expectedResult: string;
  notes?: string;
  status?: string;
  result?: string;
}

// Test run result type definition
interface TestRunResult {
  id: string;
  testCaseId: string;
  status: string;
  startedAt: string;
  completedAt: string;
  results: TestStepResult[];
}

// Test step result type definition
interface TestStepResult {
  id: string;
  testRunResultId: string;
  testStepId: string;
  status: string;
  notes?: string;
  screenshot?: string;
}

// Test case version history type
interface TestCaseVersion {
  id: string;
  testCaseId: string;
  name: string;
  description: string;
  status: string;
  tags: string[];
  isManual: boolean;
  createdAt: string;
  steps: TestStep[];
}

export default function TestCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const testCaseId = params.testCaseId as string;
  const { hasPermission } = usePermission();

  // State variables
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditingTestCase, setIsEditingTestCase] = useState(false);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [editedTestCase, setEditedTestCase] = useState<Partial<TestCase>>({});
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState<TestRunResult | null>(null);
  const [runResults, setRunResults] = useState<TestRunResult[]>([]);
  const [isViewingResults, setIsViewingResults] = useState(false);
  const [newStep, setNewStep] = useState<Partial<TestStep>>({
    description: "",
    expectedResult: "",
    notes: "",
  });
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editedStep, setEditedStep] = useState<Partial<TestStep>>({});
  const [error, setError] = useState<string | null>(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [versionHistory, setVersionHistory] = useState<TestCaseVersion[]>([]);
  
  // Add more state variables as needed

  // Fetch test case data and steps
  useEffect(() => {
    async function fetchTestCaseData() {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/projects/${projectId}/test-cases/${testCaseId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch test case data");
        }
        const data = await response.json();
        setTestCase(data);
        setSteps(data.steps || []);
        setEditedTestCase({
          name: data.name,
          description: data.description,
          status: data.status,
          tags: data.tags,
          isManual: data.isManual,
        });
      } catch (error) {
        console.error("Error fetching test case:", error);
        setError("Error loading test case. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTestCaseData();
  }, [projectId, testCaseId]);

  // Fetch test run history
  useEffect(() => {
    async function fetchTestRunHistory() {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/test-cases/${testCaseId}/runs`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch test run history");
        }
        const data = await response.json();
        setRunResults(data);
      } catch (error) {
        console.error("Error fetching test run history:", error);
      }
    }

    if (testCaseId) {
      fetchTestRunHistory();
    }
  }, [projectId, testCaseId]);

  // Function to update test case
  const updateTestCase = async () => {
    if (!hasPermission("testcase.update")) {
      toast.error("You don't have permission to update test cases");
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editedTestCase),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update test case");
      }

      const updatedTestCase = await response.json();
      setTestCase(prevTestCase => ({
        ...prevTestCase!,
        ...updatedTestCase,
      }));
      toast.success("Test case updated successfully");
      setIsEditingTestCase(false);
    } catch (error) {
      console.error("Error updating test case:", error);
      toast.error("Failed to update test case");
    }
  };

  // Function to add a new test step
  const addTestStep = async () => {
    if (!hasPermission("testcase.update")) {
      toast.error("You don't have permission to add test steps");
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/steps`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...newStep,
            order: steps.length > 0 ? Math.max(...steps.map(s => s.order)) + 1 : 1,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add test step");
      }

      const createdStep = await response.json();
      setSteps(prevSteps => [...prevSteps, createdStep]);
      setNewStep({
        description: "",
        expectedResult: "",
        notes: "",
      });
      setIsAddingStep(false);
      toast.success("Test step added successfully");
    } catch (error) {
      console.error("Error adding test step:", error);
      toast.error("Failed to add test step");
    }
  };

  // Function to update a test step
  const updateTestStep = async () => {
    if (!hasPermission("testcase.update")) {
      toast.error("You don't have permission to update test steps");
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/steps/${editingStepId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editedStep),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update test step");
      }

      const updatedStep = await response.json();
      setSteps(prevSteps =>
        prevSteps.map(step =>
          step.id === editingStepId ? { ...step, ...updatedStep } : step
        )
      );
      setEditingStepId(null);
      setEditedStep({});
      toast.success("Test step updated successfully");
    } catch (error) {
      console.error("Error updating test step:", error);
      toast.error("Failed to update test step");
    }
  };

  // Function to delete a test step
  const deleteTestStep = async (stepId: string) => {
    if (!hasPermission("testcase.update")) {
      toast.error("You don't have permission to delete test steps");
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/steps/${stepId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete test step");
      }

      setSteps(prevSteps => prevSteps.filter(step => step.id !== stepId));
      toast.success("Test step deleted successfully");
    } catch (error) {
      console.error("Error deleting test step:", error);
      toast.error("Failed to delete test step");
    }
  };

  // Function to run the test case
  const runTestCase = async () => {
    if (!hasPermission("testcase.run")) {
      toast.error("You don't have permission to run test cases");
      return;
    }

    try {
      setIsRunning(true);
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/run`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to run test case");
      }

      const runResult = await response.json();
      setCurrentRun(runResult);
      setRunResults(prevResults => [runResult, ...prevResults]);
      toast.success("Test case run started successfully");
    } catch (error) {
      console.error("Error running test case:", error);
      toast.error("Failed to run test case");
    } finally {
      setIsRunning(false);
      setIsRunDialogOpen(false);
    }
  };

  // Function to fetch version history
  const fetchVersionHistory = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/versions`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch version history");
      }
      const data = await response.json();
      setVersionHistory(data);
    } catch (error) {
      console.error("Error fetching version history:", error);
      toast.error("Failed to fetch version history");
    }
  };

  // Function to restore a version
  const restoreVersion = async (versionId: string) => {
    if (!hasPermission("testcase.update")) {
      toast.error("You don't have permission to restore test case versions");
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/versions/${versionId}/restore`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to restore version");
      }

      const restoredTestCase = await response.json();
      setTestCase(restoredTestCase);
      setSteps(restoredTestCase.steps || []);
      setIsVersionHistoryOpen(false);
      toast.success("Test case version restored successfully");
    } catch (error) {
      console.error("Error restoring version:", error);
      toast.error("Failed to restore version");
    }
  };

  // Function to duplicate test case
  const duplicateTestCase = async () => {
    if (!hasPermission("testcase.create")) {
      toast.error("You don't have permission to duplicate test cases");
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/duplicate`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to duplicate test case");
      }

      const duplicatedTestCase = await response.json();
      toast.success("Test case duplicated successfully");
      router.push(
        `/projects/${projectId}/test-cases/${duplicatedTestCase.id}`
      );
    } catch (error) {
      console.error("Error duplicating test case:", error);
      toast.error("Failed to duplicate test case");
    }
  };

  // Function to delete the test case
  const deleteTestCase = async () => {
    if (!hasPermission("testcase.delete")) {
      toast.error("You don't have permission to delete test cases");
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete test case");
      }

      toast.success("Test case deleted successfully");
      router.push(`/projects/${projectId}/test-cases`);
    } catch (error) {
      console.error("Error deleting test case:", error);
      toast.error("Failed to delete test case");
    }
  };

  // ... rest of the code remains the same ...
}
