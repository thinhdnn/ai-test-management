"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  GripVertical,
  Copy,
  Play,
  FileCode,
  RefreshCw,
  FileDown,
  Search,
  Sparkles,
  RocketIcon,
  BrainCircuit,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TestCaseDeleteButton } from "@/components/test-case-delete-button";
import { AddTestStepButton } from "@/components/add-test-step-button";
import { TestCase, TestStep } from "@/types";
import { TestStepsTable } from "@/components/test-steps-table";
import { MultiSelect } from "@/components/ui/multi-select";
import { STATUS_OPTIONS, TAG_OPTIONS } from "@/lib/utils";
import Head from "next/head";
import { SearchStepsDialog } from "@/components/search-steps-dialog";
import { AIGuideDialog } from "@/components/ai-guide-dialog";
import { RunTestButton } from "@/components/run-test-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/code-editor";

// Define type for version history
interface TestCaseVersion {
  id: string;
  testCaseId: string;
  version: string;
  name: string;
  description: string | null;
  playwright_test_script: string | null;
  createdAt: string;
  created_by: string | null;
}

// Định nghĩa kiểu cho step mới
interface NewStep {
  action: string;
  data: string;
  expected: string;
  playwrightCode: string;
  selector: string;
  disabled: boolean;
  fixtureId?: string | null; // Cho phép liên kết với fixture và có thể là null
}

export default function TestCaseDetailPage() {
  const params = useParams<{ id: string; testCaseId: string }>();
  const router = useRouter();
  // @next-codemod-ignore -- Client component can use params synchronously
  const projectId = params.id;
  // @next-codemod-ignore -- Client component can use params synchronously
  const testCaseId = params.testCaseId;

  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit test case state
  const [editMode, setEditMode] = useState(false);
  const [editedTestCase, setEditedTestCase] = useState<TestCase | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Test step state
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<TestStep | null>(null);
  const [isEditStep, setIsEditStep] = useState(false);
  const [newStep, setNewStep] = useState<NewStep>({
    action: "",
    data: "",
    expected: "",
    playwrightCode: "",
    selector: "",
    disabled: false,
  });

  // Add useRef to reference DOM elements
  const testStepsTableRef = useRef<HTMLTableElement>(null);
  const newStepRef = useRef<string | null>(null);

  // Add function to run test
  const [isRunning, setIsRunning] = useState(false);
  // Add state for reordering steps
  const [isReordering, setIsReordering] = useState(false);
  // Add state for refreshing
  const [needRefresh, setNeedRefresh] = useState(false);

  // Add states for test results
  const [testResult, setTestResult] = useState<any>(null);
  const [showTestResult, setShowTestResult] = useState(false);

  // State for search steps dialog
  const [isSearchStepsOpen, setIsSearchStepsOpen] = useState(false);

  // State for AI recorder guide dialog
  const [isAIGuideOpen, setIsAIGuideOpen] = useState(false);

  // Thêm state cho browser dialog
  const [showBrowserDialog, setShowBrowserDialog] = useState(false);
  const [selectedBrowser, setSelectedBrowser] = useState<string>("chromium");
  const [headless, setHeadless] = useState<boolean>(true);

  // State for test step versions
  const [versions, setVersions] = useState<TestCaseVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);

  // Function to fetch and view a specific version
  const [viewingVersion, setViewingVersion] = useState<TestCaseVersion | null>(
    null
  );
  const [viewingVersionSteps, setViewingVersionSteps] = useState<any[]>([]);
  const [isViewingVersion, setIsViewingVersion] = useState(false);

  // Thêm state để theo dõi các test steps được chọn
  const [selectedSteps, setSelectedSteps] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // States for import with AI functionality
  const [showImportWithAI, setShowImportWithAI] = useState(false);
  const [importPlaywrightCode, setImportPlaywrightCode] = useState("");
  const [isProcessingCode, setIsProcessingCode] = useState(false);

  // Thêm state để lưu danh sách fixtures
  const [fixtures, setFixtures] = useState<Array<{id: string, name: string, type: string}>>([]);
  const [loadingFixtures, setLoadingFixtures] = useState(false);

  // ... existing code ...
  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);
  const [newTag, setNewTag] = useState({ value: "", label: "" });
  const [customTags, setCustomTags] = useState<Array<{ value: string, label: string }>>([]);

  // Add function to create new tag
  const handleCreateTag = async () => {
    try {
      setIsSaving(true);
      
      // Format tag value with @ prefix if not present
      const tagValue = newTag.value.startsWith('@') ? newTag.value : `@${newTag.value}`;
      
      const response = await fetch(`/api/projects/${projectId}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value: tagValue,
          label: newTag.label || tagValue.replace('@', '')
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create tag");
      }

      const createdTag = await response.json();
      setCustomTags(prev => [...prev, createdTag]);
      
      // Reset form and close dialog
      setNewTag({ value: "", label: "" });
      setIsCreateTagOpen(false);
      
      toast.success("Tag created successfully");
    } catch (error) {
      console.error("Error creating tag:", error);
      toast.error("Failed to create tag");
    } finally {
      setIsSaving(false);
    }
  };

  // Load custom tags when component mounts
  useEffect(() => {
    const loadCustomTags = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/tags`);
        if (response.ok) {
          const tags = await response.json();
          setCustomTags(tags);
        }
      } catch (error) {
        console.error("Error loading custom tags:", error);
      }
    };
    
    loadCustomTags();
  }, [projectId]);

  // Combine built-in tags with custom tags
  const allTags = [...TAG_OPTIONS, ...customTags];

  // ... existing code ...

  useEffect(() => {
    const fetchTestCase = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/projects/${projectId}/test-cases/${testCaseId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch test case");
        }
        const data = await response.json();
        setTestCase(data);
        setEditedTestCase(data);
      } catch (err) {
        setError("Error loading test case");
        console.error(err);
      }
    };

    const fetchTestSteps = async () => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/test-cases/${testCaseId}/steps`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch test steps");
        }
        const data = await response.json();
        setTestSteps(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTestCase();
    fetchTestSteps();
  }, [projectId, testCaseId]);

  // Add effect to refresh test steps when needed
  useEffect(() => {
    if (needRefresh) {
      const fetchTestSteps = async () => {
        try {
          // Skip if no test case ID
          if (!testCaseId) return;

          // Load test steps
          const response = await fetch(
            `/api/projects/${projectId}/test-cases/${testCaseId}/steps`
          );

          if (!response.ok) {
            throw new Error("Failed to fetch test steps");
          }

          const data = await response.json();
          setTestSteps(data);
          setNeedRefresh(false);
        } catch (error) {
          console.error("Error fetching test steps:", error);
          toast.error("Failed to load test steps");
        }
      };

      fetchTestSteps();
    }
  }, [needRefresh, testCaseId, projectId]);

  const handleTestCaseInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!editedTestCase) return;
    setEditedTestCase({
      ...editedTestCase,
      [e.target.name]: e.target.value,
    });
  };

  const handleTestCaseSelectChange = (name: string, value: string | string[]) => {
    if (!editedTestCase) return;
    setEditedTestCase({
      ...editedTestCase,
      [name]: value,
    });
  };

  const handleSaveTestCase = async () => {
    if (!editedTestCase) return;

    try {
      setIsSaving(true);
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
      setTestCase(updatedTestCase);
      setEditMode(false);
      toast.success("Test case updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update test case");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTestCase(testCase);
    setEditMode(false);
  };

  // Test Step Functions
  const handleAddStep = () => {
    console.log("handleAddStep called");
    setCurrentStep(null);
    setNewStep({
      action: "",
      data: "",
      expected: "",
      playwrightCode: "",
      selector: "",
      disabled: false,
    });
    setIsEditStep(false);
    setIsAddStepOpen(true);
  };

  const handleEditStep = (stepId: string) => {
    const step = testSteps.find((s) => s.id === stepId);
    if (!step) return;

    setCurrentStep(step);
    setNewStep({
      action: step.action,
      data: step.data || "",
      expected: step.expected || "",
      playwrightCode: step.playwrightCode || "",
      selector: step.selector || "",
      disabled: step.disabled,
      fixtureId: (step as any).fixtureId || undefined, // Sử dụng type casting
    });
    setIsEditStep(true);
    setIsAddStepOpen(true);
  };

  const handleStepInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setNewStep({
      ...newStep,
      [e.target.name]: e.target.value,
    });
  };

  const handleStepDisabledChange = (checked: boolean) => {
    setNewStep({
      ...newStep,
      disabled: checked,
    });
  };

  // Add a refresh function for test steps
  const refreshTestSteps = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/steps`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch test steps");
      }
      const data = await response.json();
      
      // Log steps để kiểm tra fixtureId từ response
      console.log("Refreshed test steps:", data);
      
      // Kiểm tra xem các step có chứa fixtureId không
      const hasFixtureIds = data.some((step: any) => step.fixtureId);
      console.log("Steps contain fixtureIds:", hasFixtureIds);
      
      setTestSteps(data);
    } catch (err) {
      console.error("Error refreshing test steps:", err);
    }
  };

  const handleSaveStep = async () => {
    try {
      setIsSaving(true);

      if (!newStep.action) {
        toast.error("Action is required");
        return;
      }

      // Log để debug giá trị fixtureId trước khi gửi
      console.log("Sending fixtureId:", newStep.fixtureId);
      
      // Lưu ý: Việc sinh mã Playwright sẽ được xử lý tự động bởi API
      const method = isEditStep ? "PUT" : "POST";
      const url = isEditStep
        ? `/api/projects/${projectId}/test-cases/${testCaseId}/steps/${currentStep?.id}`
        : `/api/projects/${projectId}/test-cases/${testCaseId}/steps`;

      const requestBody = {
        action: newStep.action,
        data: newStep.data,
        expected: newStep.expected,
        disabled: newStep.disabled,
        order: isEditStep ? currentStep?.order : testSteps.length + 1,
        fixtureId: newStep.fixtureId, // Thêm fixtureId vào request
      };
      
      console.log("Request body:", requestBody);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error:", errorText);
        throw new Error(`Failed to ${isEditStep ? "update" : "add"} test step: ${errorText}`);
      }

      // Get response data
      const data = await response.json();
      console.log("API response:", data);
      
      // Check if fixtureId is in the response
      if (newStep.fixtureId && !data.fixtureId) {
        console.warn("fixtureId sent but not returned in response");
      }

      // After successfully saving, refresh the test steps from server
      await refreshTestSteps();

      // Update Playwright test file after saving test step
      try {
        const updatePlaywrightResponse = await fetch(
          `/api/projects/${projectId}/test-cases/${testCaseId}/update-playwright`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              testCaseId,
              step: data,
              action: isEditStep ? "update" : "add",
            }),
          }
        );

        if (!updatePlaywrightResponse.ok) {
          console.error("Cannot update Playwright test file");
        }
      } catch (playwrightErr) {
        console.error("Error updating Playwright file:", playwrightErr);
      }

      setIsAddStepOpen(false);
      toast.success(
        `Test step ${isEditStep ? "updated" : "added"} successfully`
      );

      // Refresh versions after adding/updating step
      fetchVersions();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${isEditStep ? "update" : "add"} test step`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm("Are you sure you want to delete this test step?")) {
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

      // Refresh steps from server instead of updating state manually
      await refreshTestSteps();

      // Update Playwright test file after deleting test step
      try {
        const updatePlaywrightResponse = await fetch(
          `/api/projects/${projectId}/test-cases/${testCaseId}/update-playwright`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              testCaseId,
              action: "delete",
            }),
          }
        );

        if (!updatePlaywrightResponse.ok) {
          console.error("Cannot update Playwright test file");
        }
      } catch (playwrightErr) {
        console.error("Error updating Playwright file:", playwrightErr);
      }

      toast.success("Test step deleted successfully");

      // Refresh versions after deleting step
      fetchVersions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete test step");
    }
  };

  const handleToggleDisableStep = async (stepId: string, disabled: boolean) => {
    try {
      // First update the step's disabled state
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/steps/${stepId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            disabled,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update test step");
      }

      // Refresh steps from server instead of updating state manually
      await refreshTestSteps();

      // Show toast first to give feedback
      toast.success(
        `Test step ${disabled ? "disabled" : "enabled"} successfully`
      );

      // Update Playwright test file after enabling/disabling test step
      try {
        // First update the Playwright code for this specific step
        const updatePlaywrightResponse = await fetch(
          `/api/projects/${projectId}/test-cases/${testCaseId}/update-playwright`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              testCaseId,
              stepId,
              disabled,
              action: "toggle",
            }),
          }
        );

        if (!updatePlaywrightResponse.ok) {
          console.error("Cannot update Playwright test file");
        }
        
        // After toggling, also consolidate all steps to rebuild the full test file
        // We'll do this silently in the background to avoid interrupting the user
        fetch(
          `/api/projects/${projectId}/test-cases/${testCaseId}/consolidate-steps`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              cleanupAndRebuild: true,
            }),
          }
        ).catch(err => {
          console.error("Error in background consolidate after toggle:", err);
          // We don't show an error here since this is a background operation
        });
        
      } catch (playwrightErr) {
        console.error("Error updating Playwright file:", playwrightErr);
        // Don't show an error toast for this since we already showed a success toast
      }

      // Refresh versions after toggling step
      fetchVersions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update test step");
    }
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLTableRowElement>,
    stepId: string
  ) => {
    e.dataTransfer.setData("text/plain", stepId);
    try {
      setTimeout(() => {
        if (e.currentTarget) {
          e.currentTarget.classList.add("opacity-50");
        }
        if (document.body) {
          document.body.classList.add("cursor-grabbing");
        }
      }, 0);
    } catch (err) {
      console.error("Error in drag start:", err);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    try {
      if (e.currentTarget) {
        e.currentTarget.classList.add("drag-over");
      }
    } catch (err) {
      console.error("Error in drag over:", err);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    try {
      if (e.currentTarget) {
        e.currentTarget.classList.remove("drag-over");
      }
    } catch (err) {
      console.error("Error in drag leave:", err);
    }
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLTableRowElement>,
    targetStepId: string
  ) => {
    e.preventDefault();

    try {
      if (e.currentTarget) {
        e.currentTarget.classList.remove("drag-over");
      }

      const draggedStepId = e.dataTransfer.getData("text/plain");
      if (draggedStepId === targetStepId) return;

      const draggedStepIndex = testSteps.findIndex(
        (step) => step.id === draggedStepId
      );
      const targetStepIndex = testSteps.findIndex(
        (step) => step.id === targetStepId
      );

      if (draggedStepIndex === -1 || targetStepIndex === -1) return;

      const newTestSteps = [...testSteps];
      const [draggedStep] = newTestSteps.splice(draggedStepIndex, 1);
      newTestSteps.splice(targetStepIndex, 0, draggedStep);

      const updatedSteps = newTestSteps.map((step, index) => ({
        ...step,
        order: index + 1,
      }));

      setTestSteps(updatedSteps);

      try {
        const response = await fetch(
          `/api/projects/${projectId}/test-cases/${testCaseId}/steps/reorder`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedSteps),
          }
        );

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        setTestSteps(data);

        // Update Playwright test file after reordering steps
        try {
          const updatePlaywrightResponse = await fetch(
            `/api/projects/${projectId}/test-cases/${testCaseId}/update-playwright`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                testCaseId,
                action: "reorder",
              }),
            }
          );

          if (!updatePlaywrightResponse.ok) {
            console.error("Cannot update Playwright test file");
          }
        } catch (playwrightErr) {
          console.error("Error updating Playwright file:", playwrightErr);
        }

        toast.success("Test steps reordered successfully");

        // Refresh versions after reordering steps
        fetchVersions();
      } catch (err) {
        console.error("Error reordering steps:", err);
        toast.error("Failed to save step order, but UI has been updated.");
      }
    } catch (err) {
      console.error("Error in drop handler:", err);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    try {
      if (e.currentTarget) {
        e.currentTarget.classList.remove("opacity-50");
      }

      if (document.body) {
        document.body.classList.remove("cursor-grabbing");
      }

      if (document) {
        document.querySelectorAll(".drag-over").forEach((el) => {
          if (el && el.classList) {
            el.classList.remove("drag-over");
          }
        });
      }
    } catch (err) {
      console.error("Error in drag end:", err);
    }
  };

  // Function to clone test step
  const handleCloneStep = async (step: TestStep) => {
    try {
      setIsSaving(true);
      
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/steps`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: step.action,
            data: step.data,
            expected: step.expected,
            disabled: step.disabled,
            order: testSteps.length + 1,
            fixtureId: (step as any).fixtureId || null, // Sử dụng type casting
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to clone test step");
      }

      const newStep = await response.json();

      // Add the new step to the list
      setTestSteps((prevSteps) => [...prevSteps, newStep]);

      toast.success("Test step cloned successfully");

      // Refresh versions after cloning step
      fetchVersions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to clone test step");
    } finally {
      setIsSaving(false);
    }
  };

  // Update function to run test and show results
  const handleRunTest = async () => {
    try {
      setIsRunning(true);
      setTestResult(null);
      setShowBrowserDialog(false);

      const response = await fetch(`/api/projects/${projectId}/run-tests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testCaseId,
          browser: selectedBrowser,
          headless: headless,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to run test");
      }

      const result = await response.json();
      setTestResult(result);

      // Show test results dialog
      setShowTestResult(true);

      if (result.success) {
        toast.success("Test executed successfully");
      } else {
        toast.error("Test failed");
      }

      // Reload test case to update status
      try {
        const response = await fetch(
          `/api/projects/${projectId}/test-cases/${testCaseId}`
        );
        if (response.ok) {
          const data = await response.json();
          setTestCase(data);
        }
      } catch (err) {
        console.error("Error reloading test case:", err);
      }
    } catch (error) {
      console.error("Error running test:", error);
      toast.error("Unable to run test. Please try again later.");
    } finally {
      setIsRunning(false);
    }
  };

  // Add useEffect to handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log("Key pressed:", event.key, "Modifiers:", {
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      });

      // Check for Shift+Cmd+R (Mac) or Shift+Ctrl+R (Windows) shortcut for running tests
      if (
        event.shiftKey &&
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "r"
      ) {
        event.preventDefault();
        if (!isRunning) {
          handleRunTest();
        }
      }

      // Check for Cmd+Shift+A (Mac) or Ctrl+Shift+A (Windows) shortcut to add a test step
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "a" &&
        !isAddStepOpen &&
        !isViewingVersion
      ) {
        console.log("Add step shortcut detected!");
        event.preventDefault();
        // Call the appropriate add step function based on whether there are existing steps
        if (testSteps.length === 0) {
          console.log("Opening Add First Step dialog");
          handleAddStep();
        } else {
          console.log("Opening Add Step dialog");
          setIsEditStep(false);
          setCurrentStep(null);
          setNewStep({
            action: "",
            data: "",
            expected: "",
            playwrightCode: "",
            selector: "",
            disabled: false,
          });
          setIsAddStepOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, isAddStepOpen, isViewingVersion, testSteps.length]);

  // Add function copy link API
  const handleCopyAnalyzeUrl = () => {
    const url = `${window.location.origin}/api/gemini/playwright?testCaseId=${testCaseId}`;
    navigator.clipboard.writeText(url);
    toast.success("API URL copied to clipboard");
  };

  // Add function to consolidate test steps into Playwright test case
  const handleConsolidateSteps = async () => {
    try {
      // Check if there are any test steps before proceeding
      if (testSteps.length === 0) {
        toast.error("No test steps to consolidate");
        return;
      }
      
      toast.info("Consolidating test steps...");
      setIsSaving(true);
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/consolidate-steps`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cleanupAndRebuild: true,
          }),
        }
      );
      if (!response.ok) {
        // Get more details from the error response
        const errorText = await response.text();
        let errorMessage = "Failed to consolidate steps";
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
          console.error("Consolidation error:", errorData);
        } catch (e) {
          console.error("Error parsing error response:", errorText);
        }
        
        throw new Error(errorMessage);
      }
      toast.success("Test steps consolidated successfully");
      setNeedRefresh(true);
    } catch (error) {
      console.error("Error consolidating test steps:", error);
      toast.error("Failed to consolidate test steps");
    } finally {
      setIsSaving(false);
    }
  };

  // Add function onReorderTestSteps
  const handleReorderTestSteps = async (reorderedSteps: TestStep[]) => {
    // Hiện tại TestStep từ @/types không có fixtureId, sử dụng type casting
    const steps = reorderedSteps.map((step, index) => ({
      id: step.id,
      order: index + 1,
    }));
    
    setIsSaving(true);
    
    try {
      // Call API to update the order of test steps
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/steps/reorder`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ steps }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      // After successful reordering, refresh the test steps
      setTestSteps(reorderedSteps);

      // Update Playwright test file
      try {
        const updatePlaywrightResponse = await fetch(
          `/api/projects/${projectId}/test-cases/${testCaseId}/update-playwright`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              testCaseId,
              action: "reorder",
            }),
          }
        );

        if (!updatePlaywrightResponse.ok) {
          console.error("Cannot update Playwright test file");
        }
      } catch (playwrightErr) {
        console.error("Error updating Playwright file:", playwrightErr);
      }

      // Refresh versions after reordering steps
      fetchVersions();
    } catch (err) {
      console.error("Error updating test steps order:", err);
      toast.error("Failed to update test steps order");
      // Reset items to original order on error
      setNeedRefresh(true);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Function to clone test case
  const handleCloneTestCase = async () => {
    try {
      setIsSaving(true);
      toast.info("Cloning test case...");

      // Call API to clone test case
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/clone`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error cloning test case:", errorText);
        throw new Error("Failed to clone test case");
      }

      const clonedTestCase = await response.json();

      toast.success("Test case cloned successfully");

      // Show a success message with loading state
      toast.info("Redirecting to the cloned test case...");

      // Wait briefly for the cloned test case to be properly set up
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect to the newly created test case with a full page refresh
      // This ensures all state is refreshed when viewing the new test case
      window.location.href = `/projects/${projectId}/test-cases/${clonedTestCase.id}`;
    } catch (error) {
      console.error("Error cloning test case:", error);
      toast.error("Failed to clone test case");
    } finally {
      setIsSaving(false);
    }
  };

  // Add function to export test case to CSV
  const handleExportCsv = () => {
    if (!testCase || !testSteps.length) {
      toast.error("No test steps to export");
      return;
    }

    try {
      // Format data to handle commas, quotes, and line breaks
      const formatCsvField = (field: string | null | undefined) => {
        if (!field) return "";
        const formatted = field.replace(/"/g, '""'); // Escape quotes
        return `"${formatted}"`; // Wrap in quotes to handle commas and line breaks
      };

      // Add test case information
      let csvContent = "Test Case Information\n";
      csvContent += `"Name",${formatCsvField(testCase.name)}\n`;
      csvContent += `"Description",${formatCsvField(testCase.description)}\n`;
      csvContent += `"Status",${formatCsvField(testCase.status)}\n`;
      csvContent += `"Created",${formatCsvField(
        formatDate(new Date(testCase.createdAt))
      )}\n`;
      csvContent += `"Created By",${formatCsvField(
        testCase.createdByUsername || testCase.createdBy
      )}\n`;
      csvContent += `"Updated",${formatCsvField(
        testCase.updatedAt
          ? formatDate(new Date(testCase.updatedAt))
          : "Not updated yet"
      )}\n`;
      csvContent += `"Updated By",${formatCsvField(
        testCase.updatedByUsername ||
          testCase.updatedBy ||
          (testCase.updatedAt ? "System" : "Not updated yet")
      )}\n`;
      csvContent += `"Tags",${formatCsvField(
        testCase.tags ? (Array.isArray(testCase.tags) ? testCase.tags.join(", ") : testCase.tags) : ""
      )}\n\n`;

      // Add test steps header
      csvContent += "Test Steps\n";
      csvContent += "Order,Action,Data,Expected,Disabled,Last Updated\n";

      // Add test steps data
      testSteps.forEach((step) => {
        const updatedDate = step.updatedAt
          ? formatDate(new Date(step.updatedAt))
          : formatDate(new Date(step.createdAt));

        csvContent +=
          [
            step.order,
            formatCsvField(step.action),
            formatCsvField(step.data),
            formatCsvField(step.expected),
            step.disabled ? "Yes" : "No",
            formatCsvField(updatedDate),
          ].join(",") + "\n";
      });

      // Create a blob and download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      // Create a clean filename
      const cleanTestCaseName = testCase.name
        .replace(/[^\w\s-]/g, "") // Remove special chars except spaces, hyphens, underscores
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .toLowerCase();

      link.setAttribute("href", url);
      link.setAttribute("download", `${cleanTestCaseName}-test-steps.csv`);
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Test case exported to CSV");
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast.error("Failed to export test case");
    }
  };

  // Function to update Playwright test file
  const updatePlaywrightFile = async (step: any, action: string) => {
    try {
      const updatePlaywrightResponse = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/update-playwright`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            testCaseId,
            step,
            action,
          }),
        }
      );

      if (!updatePlaywrightResponse.ok) {
        console.error("Cannot update Playwright test file");
      }
    } catch (playwrightErr) {
      console.error("Error updating Playwright file:", playwrightErr);
    }
  };

  // Fetch test case versions
  const fetchVersions = async () => {
    try {
      setIsLoadingVersions(true);
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/versions`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch versions");
      }

      const versionsData = await response.json();
      setVersions(versionsData);
    } catch (error) {
      console.error("Error fetching versions:", error);
      toast.error("Failed to load version history");
    } finally {
      setIsLoadingVersions(false);
    }
  };

  // Restore a specific version
  const handleRestoreVersion = async (versionId: string) => {
    try {
      setIsRestoringVersion(true);
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/versions/${versionId}/restore`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to restore version");
      }

      toast.success("Version restored successfully");
      // Refresh test case and test steps
      try {
        const response = await fetch(
          `/api/projects/${projectId}/test-cases/${testCaseId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch test case");
        }
        const data = await response.json();
        setTestCase(data);
        setEditedTestCase(data);
      } catch (err) {
        console.error("Error refreshing test case:", err);
      }
      await refreshTestSteps();
      // Reset selected version
      setSelectedVersionId("");
    } catch (error) {
      console.error("Error restoring version:", error);
      toast.error("Failed to restore version");
    } finally {
      setIsRestoringVersion(false);
    }
  };

  // Load versions when test case loads
  useEffect(() => {
    if (testCase) {
      fetchVersions();
    }
  }, [testCase]);

  // Auto-select the latest version when versions are loaded
  useEffect(() => {
    if (versions.length > 0) {
      // Select the latest version (first in the array since sorted by createdAt desc)
      const latestVersion = versions[0];
      setSelectedVersionId(latestVersion.id);

      // Instead of using fetchVersionDetails, update the test case directly
      // We won't call fetchVersionDetails(latestVersion.id) to avoid triggering the viewing banner

      // Just set the latest version as selected, without showing "Viewing version" UI
      // Test steps will show the current ones, which should be the latest version already
    }
  }, [versions]);

  // Handle version selection change
  const handleVersionChange = (versionId: string) => {
    if (versionId === "current") {
      setSelectedVersionId("");
      return;
    }

    setSelectedVersionId(versionId);
    fetchVersionDetails(versionId);
  };

  // Function to fetch and view a specific version
  const fetchVersionDetails = async (versionId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/versions/${versionId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch version details");
      }

      const versionData = await response.json();
      setViewingVersion(versionData.version);
      setViewingVersionSteps(versionData.steps);
      setIsViewingVersion(true);
    } catch (error) {
      console.error("Error fetching version details:", error);
      toast.error("Failed to load version details");
    }
  };

  // Reset viewing when we exit viewing mode
  const exitVersionView = () => {
    setViewingVersion(null);
    setViewingVersionSteps([]);
    setIsViewingVersion(false);
    setSelectedVersionId("");
  };

  // Thêm hàm xử lý chọn/bỏ chọn tất cả steps
  const handleSelectAllSteps = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      // Chọn tất cả steps
      setSelectedSteps(testSteps.map((step) => step.id));
    } else {
      // Bỏ chọn tất cả
      setSelectedSteps([]);
    }
  };

  // Thêm hàm xử lý chọn/bỏ chọn một step
  const handleSelectStep = (stepId: string, checked: boolean) => {
    if (checked) {
      setSelectedSteps((prev) => [...prev, stepId]);
    } else {
      setSelectedSteps((prev) => prev.filter((id) => id !== stepId));
    }
  };

  // Thêm hàm xử lý xóa tất cả steps đã chọn
  const handleDeleteSelectedSteps = async () => {
    if (selectedSteps.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedSteps.length} test steps?`
      )
    ) {
      return;
    }

    try {
      // API call để xóa các steps đã chọn
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}/steps/bulk-delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ stepIds: selectedSteps }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete test steps");
      }

      // Refresh steps from server
      await refreshTestSteps();

      // Reset các state liên quan
      setSelectedSteps([]);
      setSelectAll(false);

      // Update Playwright test file
      try {
        const updatePlaywrightResponse = await fetch(
          `/api/projects/${projectId}/test-cases/${testCaseId}/update-playwright`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              testCaseId,
              action: "bulk-delete",
            }),
          }
        );

        if (!updatePlaywrightResponse.ok) {
          console.error("Cannot update Playwright test file");
        }
      } catch (playwrightErr) {
        console.error("Error updating Playwright file:", playwrightErr);
      }

      toast.success(`${selectedSteps.length} test steps deleted successfully`);

      // Refresh versions sau khi xóa steps
      fetchVersions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete test steps");
    }
  };

  // Handle Playwright code import with AI
  const handleImportWithAI = async () => {
    if (!importPlaywrightCode.trim()) {
      toast.error("Please enter Playwright code to import");
      return;
    }

    try {
      setIsProcessingCode(true);
      
      // Split the code into separate lines
      const codeLines = importPlaywrightCode
        .split("\n")
        .filter(line => line.trim().length > 0);
      
      let successCount = 0;
      let failureCount = 0;
      
      // Process each line using the Gemini Playwright API
      for (let i = 0; i < codeLines.length; i++) {
        const line = codeLines[i];
        try {
          // Skip comments or empty lines
          if (line.trim().startsWith('//') || !line.trim()) {
            continue;
          }
          
          // Call the existing Playwright analysis API
          const response = await fetch(`/api/gemini/playwright?testCaseId=${testCaseId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "analyze",
              playwrightCode: line
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Analysis failed for line ${i+1}:`, errorText);
            failureCount++;
            toast.error(`Failed to analyze line ${i+1}`);
            continue; // Skip to the next line instead of failing completely
          }

          const result = await response.json();
          if (result && result.success) {
            successCount++;
          } else {
            failureCount++;
            console.error(`Failed to create step from line ${i+1}:`, result?.error || 'Unknown error');
            toast.error(`Failed to create step from line ${i+1}`);
          }
          
        } catch (stepError: any) {
          console.error(`Error processing line ${i+1}:`, stepError);
          failureCount++;
          toast.error(`Error processing line ${i+1}: ${stepError.message || 'Unknown error'}`);
          // Continue with next line instead of aborting the entire process
        }
      }
      
      // Refresh steps to show the new additions
      await refreshTestSteps();
      
      // Show final summary based on success/failure counts
      if (successCount > 0 && failureCount === 0) {
        toast.success(`Added ${successCount} steps from code import`);
      } else if (successCount > 0 && failureCount > 0) {
        toast.warning(`Added ${successCount} steps, but ${failureCount} steps failed`);
      } else if (successCount === 0 && failureCount > 0) {
        toast.error(`Failed to import any steps. All ${failureCount} steps failed`);
      }
      
      // Close the dialog and reset input only if at least one step was successful
      if (successCount > 0) {
        setShowImportWithAI(false);
        setImportPlaywrightCode("");
      }
    } catch (error: any) {
      console.error("Error importing code with AI:", error);
      toast.error(`Failed to import code with AI: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessingCode(false);
    }
  };

  // Thêm hàm để fetch fixtures
  const fetchFixtures = async () => {
    try {
      setLoadingFixtures(true);
      const response = await fetch(`/api/projects/${projectId}/fixtures`);
      if (!response.ok) {
        throw new Error("Failed to fetch fixtures");
      }
      const data = await response.json();
      setFixtures(data);
    } catch (err) {
      console.error("Error fetching fixtures:", err);
    } finally {
      setLoadingFixtures(false);
    }
  };

  // Thêm useEffect để load fixtures khi component mount
  useEffect(() => {
    fetchFixtures();
  }, [projectId]);

  // Thêm hàm xử lý khi thay đổi giá trị fixture
  const handleFixtureChange = (value: string) => {
    if (value === "none") {
      // Nếu người dùng chọn "None", chỉ xóa fixtureId
      setNewStep((prev) => ({
        ...prev,
        fixtureId: null,
      }));
    } else {
      // Nếu người dùng chọn fixture, tự động điền action với tên fixture
      const selectedFixture = fixtures.find(f => f.id === value);
      const fixtureName = selectedFixture ? selectedFixture.name : value;
      
      setNewStep((prev) => ({
        ...prev,
        fixtureId: value,
        action: `Call step: ${fixtureName}`,
      }));
    }
  };

  // Chỗ này sẽ nằm đâu đó trong component, thường là gần phần return đầu tiên
  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading test case...</p>
        </div>
      </div>
    );
  }

  // Chỉ hiển thị "not found" khi đã không còn loading nữa
  if (!loading && (!testCase || error)) {
    return (
      <div className="container px-4 py-6 sm:px-6 md:px-8">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-red-500">{error || "Test case not found. Please check the URL and try again."}</p>
          <Button asChild variant="outline">
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        table td {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .test-steps-table td.data-cell {
          max-width: 300px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        @media (min-width: 768px) {
          .custom-table-container {
            width: 100%;
            table-layout: fixed;
          }
        }
      `}</style>
      <div className="container px-4 py-6 sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold">
              {editMode
                ? "Edit Test Case"
                : testCase
                ? testCase.name
                : "Test Case Details"}
            </h2>

            {/* Version Dropdown - Always show */}
            {!editMode && testCase && (
              <div className="ml-4">
                <Select
                  value={selectedVersionId}
                  onValueChange={handleVersionChange}
                  disabled={isLoadingVersions || isRestoringVersion}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={`v${testCase.version}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">
                      Current ({testCase.version})
                    </SelectItem>
                    {versions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        {version.version} ({formatDate(version.createdAt)})
                      </SelectItem>
                    ))}
                    {versions.length === 0 && (
                      <SelectItem value="no-versions" disabled>
                        No previous versions
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Version viewing banner */}
            {isViewingVersion && viewingVersion && (
              <div className="ml-4 flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-md">
                <span className="text-sm">
                  Viewing version {viewingVersion.version}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (
                      confirm(
                        "Restore this version? This will replace your current test steps."
                      )
                    ) {
                      handleRestoreVersion(viewingVersion.id);
                      exitVersionView();
                    }
                  }}
                >
                  Restore
                </Button>
                <Button size="sm" variant="ghost" onClick={exitVersionView}>
                  Exit
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/projects/${params.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            {!editMode && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(true)}
                      disabled={isViewingVersion}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleCloneTestCase}
                    disabled={isSaving}
                  >
                    <Copy className="h-4 w-4" />
                    {isSaving && <span className="ml-2">...</span>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clone</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {isViewingVersion ? (
                    <Button variant="outline" disabled>
                      <FileCode className="h-4 w-4" />
                    </Button>
                  ) : testCase?.isManual ? null : (
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        try {
                          setIsSaving(true);
                          toast.info("Preparing Playwright test...");
                          
                          // No special handling for zero steps needed - the API now handles it
                          const response = await fetch(
                            `/api/projects/${projectId}/test-cases/${testCaseId}/consolidate-steps`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                cleanupAndRebuild: true,
                                preserveImports: true
                              }),
                            }
                          );
                          
                          if (!response.ok) {
                            // Get more details from the error response
                            const errorText = await response.text();
                            let errorMessage = "Failed to consolidate steps";
                            
                            try {
                              const errorData = JSON.parse(errorText);
                              if (errorData && errorData.error) {
                                errorMessage = errorData.error;
                              }
                              console.error("Consolidation error:", errorData);
                            } catch (e) {
                              console.error("Error parsing error response:", errorText);
                            }
                            
                            toast.error(errorMessage);
                            return; // Don't navigate if consolidation failed
                          }
                          
                          // Successful consolidation - navigate to the Playwright view
                          router.push(`/projects/${params.id}/test-cases/${params.testCaseId}/playwright`);
                        } catch (error) {
                          console.error("Error preparing Playwright test:", error);
                          toast.error("Failed to prepare Playwright test");
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                    >
                      <FileCode className="h-4 w-4" />
                    </Button>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p>View Playwright Test</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {!testCase?.isManual && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleConsolidateSteps}
                      disabled={isViewingVersion}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Consolidate Steps</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleExportCsv}
                    disabled={!testSteps.length || isViewingVersion}
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export to CSV</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* Nút ẩn để Copy API URL */}
            <Button
              variant="outline"
              onClick={handleCopyAnalyzeUrl}
              className="hidden"
            >
              <Copy className="h-4 w-4" />
            </Button>
            {!testCase?.isManual && (
              <>
                <RunTestButton
                  projectId={projectId}
                  testCaseId={testCaseId}
                  mode="single"
                  onTestRunComplete={(result) => {
                    setTestResult(result);
                    setShowTestResult(true);
                  }}
                  onRefreshTestCases={async () => {
                    try {
                      const response = await fetch(
                        `/api/projects/${projectId}/test-cases/${testCaseId}`
                      );
                      if (response.ok) {
                        const data = await response.json();
                        setTestCase(data);
                      }
                    } catch (err) {
                      console.error("Error reloading test case:", err);
                    }
                  }}
                  disabled={isViewingVersion}
                />
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Test Case Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={editedTestCase?.name || ""}
                      onChange={handleTestCaseInputChange}
                      className="mt-1"
                      placeholder="Enter test case name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={editedTestCase?.description || ""}
                      onChange={handleTestCaseInputChange}
                      className="mt-1"
                      placeholder="Enter test case description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={editedTestCase?.status || ""}
                        onValueChange={(value) =>
                          handleTestCaseSelectChange("status", value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tags">Tags</Label>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2 border rounded-md p-4">
                          {allTags.map((tag) => (
                            <div
                              key={tag.value}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`tag-${tag.value}`}
                                checked={Array.isArray(editedTestCase?.tags) && editedTestCase.tags.includes(tag.value)}
                                onCheckedChange={(checked) => {
                                  if (!editedTestCase) return;
                                  const currentTags = Array.isArray(editedTestCase.tags) ? editedTestCase.tags : [];
                                  const newTags = checked
                                    ? [...currentTags, tag.value]
                                    : currentTags.filter((t) => t !== tag.value);
                                  handleTestCaseSelectChange("tags", newTags);
                                }}
                              />
                              <label
                                htmlFor={`tag-${tag.value}`}
                                className={`text-sm font-medium leading-none cursor-pointer ${
                                  tag.value.includes("@high") || tag.value.includes("@fast")
                                    ? "text-green-600"
                                    : tag.value.includes("@medium") || tag.value.includes("@slow")
                                    ? "text-yellow-600"
                                    : tag.value.includes("@low") || tag.value.includes("@critical")
                                    ? "text-red-600"
                                    : "text-blue-600"
                                }`}
                              >
                                {tag.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsCreateTagOpen(true)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Tag
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cancel changes and go back</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleSaveTestCase}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Pencil className="h-4 w-4 mr-2" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Save changes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Status
                    </h3>
                    <div className="mt-1">
                      {testCase && (
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            testCase.status === "passed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : testCase.status === "failed"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                          }`}
                        >
                          {testCase.status === "passed" && (
                            <svg
                              className="mr-1.5 h-2 w-2 text-green-500 dark:text-green-300 fill-current"
                              viewBox="0 0 8 8"
                            >
                              <circle cx="4" cy="4" r="3" />
                            </svg>
                          )}
                          {testCase.status === "failed" && (
                            <svg
                              className="mr-1.5 h-2 w-2 text-red-500 dark:text-red-300 fill-current"
                              viewBox="0 0 8 8"
                            >
                              <circle cx="4" cy="4" r="3" />
                            </svg>
                          )}
                          {testCase.status === "pending" && (
                            <svg
                              className="mr-1.5 h-2 w-2 text-yellow-500 dark:text-yellow-300 fill-current"
                              viewBox="0 0 8 8"
                            >
                              <circle cx="4" cy="4" r="3" />
                            </svg>
                          )}
                          {testCase.status === "passed"
                            ? "Passed"
                            : testCase.status === "failed"
                            ? "Failed"
                            : "Pending"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Created Date
                    </h3>
                    <p className="mt-1">
                      {testCase && formatDate(new Date(testCase.createdAt))}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Created By
                    </h3>
                    <p className="mt-1">
                      {testCase && (testCase.createdByUsername ||
                        testCase.createdBy ||
                        "System")}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Updated At
                    </h3>
                    <p className="mt-1">
                      {testCase && (testCase.updatedAt
                        ? formatDate(new Date(testCase.updatedAt))
                        : "Not updated yet")}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Updated By
                    </h3>
                    <p className="mt-1">
                      {testCase && (testCase.updatedByUsername ||
                        testCase.updatedBy ||
                        (testCase.updatedAt ? "System" : "Not updated yet"))}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Last Run
                    </h3>
                    <p className="mt-1">
                      {testCase && (testCase.lastRun
                        ? formatDate(new Date(testCase.lastRun))
                        : "Not run yet")}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Last Run By
                    </h3>
                    <p className="mt-1">
                      {testCase && (testCase.lastRunByUsername ||
                        testCase.lastRunBy ||
                        "Not available")}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {testCase && testCase.tags ? (
                        Array.isArray(testCase.tags) ? (
                          testCase.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                tag === "@fast" || tag === "@high"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                  : tag === "@slow" || tag === "@medium"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                                  : tag === "@critical" || tag === "@low"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                              }`}
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                            {testCase.tags}
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          No tags
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Test Cases Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold">Test Steps</h2>
            <div className="text-sm text-muted-foreground">
              {isViewingVersion ? viewingVersionSteps.length : testSteps.length}{" "}
              steps
            </div>

            {/* Thêm nút Delete All khi có steps được chọn */}
            {selectedSteps.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelectedSteps}
                className="ml-4"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedSteps.length})
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Only show these buttons when not viewing a version */}
            {!isViewingVersion && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSearchStepsOpen(true)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Steps
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportWithAI(true)}
                  disabled={isViewingVersion}
                >
                  <BrainCircuit className="h-4 w-4 mr-2" />
                  Import with AI
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAIGuideOpen(true)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate with AI
                </Button>

                {/* Only show Add Step button when there are existing steps */}
                {testSteps.length > 0 && (
                  <AddTestStepButton
                    size="sm"
                    data-test-id="add-test-step-button"
                    onClick={() => {
                      setIsEditStep(false);
                      setCurrentStep(null);
                      setNewStep({
                        action: "",
                        data: "",
                        expected: "",
                        playwrightCode: "",
                        selector: "",
                        disabled: false,
                      });
                      setIsAddStepOpen(true);
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {isViewingVersion && viewingVersionSteps.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground mb-4">
                No test steps in this version
              </p>
            </CardContent>
          </Card>
        ) : !isViewingVersion && testSteps.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground mb-4">
                No test steps defined yet
              </p>
              <AddTestStepButton
                size="sm"
                data-test-id="add-test-step-button"
                onClick={() => {
                  setIsEditStep(false);
                  setCurrentStep(null);
                  setNewStep({
                    action: "",
                    data: "",
                    expected: "",
                    playwrightCode: "",
                    selector: "",
                    disabled: false,
                  });
                  setIsAddStepOpen(true);
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {isViewingVersion ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Expected Result</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingVersionSteps.map((step, index) => (
                      <TableRow key={step.id}>
                        <TableCell>{step.order}</TableCell>
                        <TableCell>{step.action}</TableCell>
                        <TableCell className="data-cell">
                          {step.data || "-"}
                        </TableCell>
                        <TableCell className="data-cell">
                          {step.expected || "-"}
                        </TableCell>
                        <TableCell>
                          {step.disabled ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                              Disabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Enabled
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <TestStepsTable
                  testSteps={testSteps}
                  onReorder={handleReorderTestSteps}
                  onEdit={handleEditStep}
                  onDelete={handleDeleteStep}
                  onToggleDisable={handleToggleDisableStep}
                  onClone={handleCloneStep}
                  selectedSteps={selectedSteps}
                  onSelectStep={handleSelectStep}
                  selectAll={selectAll}
                  onSelectAll={handleSelectAllSteps}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Step Dialog */}
        <Dialog open={isAddStepOpen} onOpenChange={setIsAddStepOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isEditStep ? "Edit Test Step" : "Add Test Step"}
              </DialogTitle>
              <DialogDescription>
                {isEditStep
                  ? "Update the details of this test step"
                  : "Enter the details for the new test step"}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newStep.action) {
                  handleSaveStep();
                }
              }}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="action">Action (Required)</Label>
                  <Input
                    id="action"
                    name="action"
                    value={newStep.action || ""}
                    onChange={handleStepInputChange}
                    placeholder="e.g. click, fill, navigate"
                    autoFocus
                    disabled={!!newStep.fixtureId && newStep.fixtureId !== "none"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data">Data (Optional)</Label>
                  <Input
                    id="data"
                    name="data"
                    value={newStep.data || ""}
                    onChange={handleStepInputChange}
                    placeholder="e.g. input data or element selector"
                    disabled={!!newStep.fixtureId && newStep.fixtureId !== "none"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected">Expected Result (Optional)</Label>
                  <Textarea
                    id="expected"
                    name="expected"
                    value={newStep.expected || ""}
                    onChange={handleStepInputChange}
                    placeholder="e.g. form should be submitted, element should be visible"
                    disabled={!!newStep.fixtureId && newStep.fixtureId !== "none"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playwrightCode">
                    Playwright Code (Optional)
                  </Label>
                  <Textarea
                    id="playwrightCode"
                    name="playwrightCode"
                    value={newStep.playwrightCode || ""}
                    onChange={handleStepInputChange}
                    placeholder="e.g. await page.click('#submit-button')"
                    disabled={!!newStep.fixtureId && newStep.fixtureId !== "none"}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="disabled"
                    checked={newStep.disabled}
                    onCheckedChange={handleStepDisabledChange}
                  />
                  <Label htmlFor="disabled">
                    Disable this step (will be skipped during test execution)
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fixtureId">Fixture (Optional)</Label>
                  <Select
                    value={newStep.fixtureId || "none"}
                    onValueChange={handleFixtureChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a fixture (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {fixtures.map((fixture) => (
                        <SelectItem key={fixture.id} value={fixture.id}>
                          {fixture.name} ({fixture.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loadingFixtures && <p className="text-sm text-muted-foreground">Loading fixtures...</p>}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddStepOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="submit"
                        disabled={isSaving || !newStep.action}
                      >
                        {isSaving
                          ? "Saving..."
                          : isEditStep
                          ? "Update Step"
                          : "Add Step"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Press Enter to {isEditStep ? "update" : "add"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Test Results Dialog */}
        <Dialog open={showTestResult} onOpenChange={setShowTestResult}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Test Results</DialogTitle>
              <DialogDescription>
                View the results from the executed test case
              </DialogDescription>
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
                    {/* Show formatted test results if available */}
                    {testResult.testResults && (
                      <div className="border rounded-md p-4 space-y-3">
                        <h3 className="font-medium">Result Details:</h3>
                        {/* Summary stats */}
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

                        {/* Test Details */}
                        {testResult.testResults.suites &&
                          testResult.testResults.suites.length > 0 && (
                            <div className="space-y-3">
                              {testResult.testResults.suites.map(
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

                    {/* Step details */}
                    {testResult.steps && testResult.steps.length > 0 && (
                      <div className="border rounded-md p-4 space-y-3">
                        <h3 className="font-medium">Step Details:</h3>
                        <div className="divide-y">
                          {testResult.steps.map((step: any, index: number) => (
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
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show errors */}
                    {testResult.error && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-red-500">Error:</h3>
                        <pre className="bg-red-50 text-red-700 p-4 rounded-md overflow-x-auto text-xs">
                          {testResult.error}
                        </pre>
                      </div>
                    )}

                    {/* Show screenshots if available */}
                    {testResult.screenshots &&
                      testResult.screenshots.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium">Screenshots:</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {testResult.screenshots.map(
                              (screenshot: string, index: number) => (
                                <div
                                  key={index}
                                  className="border rounded-md overflow-hidden"
                                >
                                  <img
                                    src={
                                      screenshot.startsWith("data:")
                                        ? screenshot
                                        : `/screenshots/${screenshot}`
                                    }
                                    alt={`Screenshot ${index + 1}`}
                                    className="w-full h-auto"
                                  />
                                  <div className="p-2 text-xs text-center">
                                    Screenshot {index + 1}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    
                    {/* Show video if available */}
                    {testResult.videoUrl && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Test Recording:</h3>
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
                  </TabsContent>
                  
                  <TabsContent value="logs" className="mt-4">
                    {/* Output logs */}
                    {testResult.output && (
                      <div className="space-y-2">
                        <h3 className="font-medium">Log Output:</h3>
                        <div className="bg-gray-50 p-4 rounded-md h-[400px] overflow-auto text-sm">
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
                <p className="text-muted-foreground">
                  No test results available
                </p>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setShowTestResult(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Search Steps Dialog */}
        <SearchStepsDialog
          open={isSearchStepsOpen}
          onOpenChange={setIsSearchStepsOpen}
          projectId={projectId}
          testCaseId={testCaseId}
          onStepAdded={(newStep) => {
            setTestSteps((prevSteps) => [...prevSteps, newStep]);
          }}
          onUpdatePlaywright={updatePlaywrightFile}
        />

        {/* AI Guide Dialog */}
        <AIGuideDialog
          open={isAIGuideOpen}
          onOpenChange={setIsAIGuideOpen}
          testCase={testCase}
        />
        
        {/* Import with AI Dialog */}
        <Dialog open={showImportWithAI} onOpenChange={setShowImportWithAI}>
          <DialogContent className="max-w-3xl import-ai-dialog-content">
            <DialogHeader>
              <DialogTitle>Import Playwright Code with AI</DialogTitle>
              <DialogDescription>
                Paste your Playwright code below, and AI will analyze and create test steps from it.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4 import-ai-dialog-body" style={{ minHeight: "400px" }}>
              <div className="space-y-2 flex flex-col h-full" style={{ minHeight: "350px" }}>
                <Label htmlFor="playwrightCode">Playwright Code</Label>
                <div className="code-editor-container" style={{ minHeight: "300px", flex: "1 1 auto" }}>
                  <CodeEditor
                    value={importPlaywrightCode}
                    onChange={(value) => setImportPlaywrightCode(value)}
                    placeholder="Paste your Playwright code here..."
                    height="100%"
                  />
                </div>
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4 flex-shrink-0">
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
                      The AI will analyze each Playwright command and create appropriate test steps.
                      For best results, paste well-formatted code with each action on separate lines.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex-shrink-0">
              <Button variant="outline" onClick={() => setShowImportWithAI(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleImportWithAI} 
                disabled={isProcessingCode || !importPlaywrightCode.trim()}
              >
                {isProcessingCode ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="h-4 w-4 mr-2" />
                    Import with AI
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Tag Dialog */}
        <Dialog open={isCreateTagOpen} onOpenChange={setIsCreateTagOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
              <DialogDescription>
                Add a new tag to use in test cases
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateTag(); }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tagValue">Tag Value</Label>
                  <Input
                    id="tagValue"
                    placeholder="e.g. critical (without @)"
                    value={newTag.value}
                    onChange={(e) => setNewTag(prev => ({ ...prev, value: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tagLabel">Display Label (Optional)</Label>
                  <Input
                    id="tagLabel"
                    placeholder="e.g. Critical Priority"
                    value={newTag.label}
                    onChange={(e) => setNewTag(prev => ({ ...prev, label: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateTagOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || !newTag.value.trim()}
                >
                  {isSaving ? "Creating..." : "Create Tag"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
