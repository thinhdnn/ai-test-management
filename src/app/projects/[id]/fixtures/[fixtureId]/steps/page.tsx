"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Copy,
  RefreshCw,
  BrainCircuit,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TestStepsTable } from "@/components/test-steps-table";
import { TestStep } from "@/types";
import { CodeEditor } from "@/components/code-editor";

// Define type for fixture
interface Fixture {
  id: string;
  name: string;
  description?: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

// Define type for step
interface Step {
  id: string;
  action: string;
  data?: string;
  expected?: string;
  playwrightCode?: string;
  order: number;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Define type for new step
interface NewStep {
  action: string;
  data: string;
  expected: string;
  playwrightCode: string;
  disabled: boolean;
}

export default function FixtureStepsPage() {
  const params = useParams<{ id: string; fixtureId: string }>();
  const projectId = params.id;
  const fixtureId = params.fixtureId;

  // State for fixture details
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit fixture state
  const [editMode, setEditMode] = useState(false);
  const [editedFixture, setEditedFixture] = useState<Fixture | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Step state
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [isEditStep, setIsEditStep] = useState(false);
  const [newStep, setNewStep] = useState<NewStep>({
    action: "",
    data: "",
    expected: "",
    playwrightCode: "",
    disabled: false,
  });

  // Selection states
  const [selectedSteps, setSelectedSteps] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // States for import with AI functionality
  const [showImportWithAI, setShowImportWithAI] = useState(false);
  const [importPlaywrightCode, setImportPlaywrightCode] = useState("");
  const [isProcessingCode, setIsProcessingCode] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null); // Reset error state before fetching
        
        // Fetch fixture and steps in parallel
        const [fixtureResponse, stepsResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}/fixtures/${fixtureId}`),
          fetch(`/api/projects/${projectId}/fixtures/${fixtureId}/steps`)
        ]);

        // Handle fixture response
        if (!fixtureResponse.ok) {
          if (fixtureResponse.status === 404) {
            throw new Error("Fixture not found - The requested fixture does not exist");
          }
          throw new Error("Failed to fetch fixture details");
        }

        // Handle steps response
        if (!stepsResponse.ok) {
          throw new Error("Failed to fetch fixture steps");
        }

        if (isMounted) {
          const fixtureData = await fixtureResponse.json();
          const stepsData = await stepsResponse.json();
          
          setFixture(fixtureData);
          setEditedFixture(fixtureData);
          setSteps(stepsData);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Error loading fixture details");
          setFixture(null);
          setSteps([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [projectId, fixtureId]);

  const handleFixtureInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!editedFixture) return;
    setEditedFixture({
      ...editedFixture,
      [e.target.name]: e.target.value,
    });
  };

  const handleFixtureTypeChange = (value: string) => {
    if (!editedFixture) return;
    setEditedFixture({
      ...editedFixture,
      type: value,
    });
  };

  const handleSaveFixture = async () => {
    if (!editedFixture) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedFixture),
      });

      if (!response.ok) {
        throw new Error("Failed to update fixture");
      }

      const updatedFixture = await response.json();
      setFixture(updatedFixture);
      setEditMode(false);
      toast.success("Fixture updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update fixture");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedFixture(fixture);
    setEditMode(false);
  };

  // Step Functions
  const handleAddStep = () => {
    setCurrentStep(null);
    setNewStep({
      action: "",
      data: "",
      expected: "",
      playwrightCode: "",
      disabled: false,
    });
    setIsEditStep(false);
    setIsAddStepOpen(true);
  };

  const handleEditStep = (stepId: string) => {
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;

    setCurrentStep(step);
    setNewStep({
      action: step.action,
      data: step.data || "",
      expected: step.expected || "",
      playwrightCode: step.playwrightCode || "",
      disabled: step.disabled,
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

  // Function to refresh steps
  const refreshSteps = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}/steps`);
      if (!response.ok) {
        throw new Error("Failed to fetch fixture steps");
      }
      const data = await response.json();
      setSteps(data);
    } catch (err) {
      console.error("Error refreshing fixture steps:", err);
    }
  };

  const handleSaveStep = async () => {
    try {
      setIsSaving(true);

      if (!newStep.action) {
        toast.error("Action is required");
        return;
      }

      const method = isEditStep ? "PUT" : "POST";
      const url = isEditStep
        ? `/api/projects/${projectId}/fixtures/${fixtureId}/steps/${currentStep?.id}`
        : `/api/projects/${projectId}/fixtures/${fixtureId}/steps`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: newStep.action,
          data: newStep.data,
          expected: newStep.expected,
          playwrightCode: newStep.playwrightCode,
          disabled: newStep.disabled,
          order: isEditStep ? currentStep?.order : steps.length,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditStep ? "update" : "add"} fixture step`);
      }

      // After successfully saving, refresh the steps from server
      await refreshSteps();

      setIsAddStepOpen(false);
      toast.success(`Fixture step ${isEditStep ? "updated" : "added"} successfully`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${isEditStep ? "update" : "add"} fixture step`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm("Are you sure you want to delete this fixture step?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/fixtures/${fixtureId}/steps/${stepId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete fixture step");
      }

      // Refresh steps from server
      await refreshSteps();
      toast.success("Fixture step deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete fixture step");
    }
  };

  const handleToggleDisableStep = async (stepId: string, disabled: boolean) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/fixtures/${fixtureId}/steps/${stepId}`,
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
        throw new Error("Failed to update fixture step");
      }

      // Refresh steps from server
      await refreshSteps();
      toast.success(`Fixture step ${disabled ? "disabled" : "enabled"} successfully`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update fixture step");
    }
  };

  // Function to clone step
  const handleCloneStep = async (step: TestStep) => {
    try {
      setIsSaving(true);

      // Create a copy of the step, but assign a new ID
      const clonedStep = {
        action: step.action,
        data: step.data || "",
        expected: step.expected || "",
        playwrightCode: step.playwrightCode || "",
        disabled: step.disabled,
        order: steps.length + 1, // Place at the end of the list
      };

      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}/steps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clonedStep),
      });

      if (!response.ok) {
        throw new Error("Failed to clone fixture step");
      }

      // Refresh steps from server
      await refreshSteps();
      toast.success("Fixture step cloned successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to clone fixture step");
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle cloning the fixture
  const handleCloneFixture = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}/clone`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Failed to clone fixture");
      }

      const data = await response.json();
      toast.success("Fixture cloned successfully");
      
      // Redirect to the new cloned fixture
      if (data.fixture && data.fixture.id) {
        window.location.href = `/projects/${projectId}/fixtures/${data.fixture.id}/steps`;
      }
    } catch (error) {
      console.error("Error cloning fixture:", error);
      toast.error("Failed to clone fixture");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reordering steps
  const handleReorderSteps = async (reorderedSteps: TestStep[]) => {
    setIsSaving(true);
    try {
      // Call API to update the order of steps
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}/steps/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reorderedSteps.map((step, index) => ({
          id: step.id,
          order: index,
        }))),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      // Refresh steps from server
      await refreshSteps();
    } catch (error) {
      console.error("Error updating fixture steps order:", error);
      toast.error("Failed to update fixture steps order");
      // Refresh steps to reset order
      await refreshSteps();
    } finally {
      setIsSaving(false);
    }
  };

  // Handle select all steps
  const handleSelectAllSteps = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      // Select all steps
      setSelectedSteps(steps.map(step => step.id));
    } else {
      // Deselect all
      setSelectedSteps([]);
    }
  };

  // Handle select/deselect a step
  const handleSelectStep = (stepId: string, checked: boolean) => {
    if (checked) {
      setSelectedSteps(prev => [...prev, stepId]);
    } else {
      setSelectedSteps(prev => prev.filter(id => id !== stepId));
    }
  };

  // Handle delete selected steps
  const handleDeleteSelectedSteps = async () => {
    if (selectedSteps.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedSteps.length} fixture steps?`)) {
      return;
    }

    try {
      // API call to delete selected steps
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}/steps/bulk-delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stepIds: selectedSteps }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete fixture steps");
      }

      // Refresh steps list
      await refreshSteps();

      // Reset states
      setSelectedSteps([]);
      setSelectAll(false);

      toast.success(`${selectedSteps.length} fixture steps deleted successfully`);
    } catch (error) {
      console.error("Error deleting steps:", error);
      toast.error("Failed to delete fixture steps");
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
      
      // Validate fixtureId first
      if (!fixtureId) {
        toast.error("Cannot import: Missing fixture ID");
        return;
      }
      
      // Split the code into separate lines
      const codeLines = importPlaywrightCode
        .split("\n")
        .filter(line => line.trim().length > 0 && !line.trim().startsWith('//'));
      
      let successCount = 0;
      let failureCount = 0;
      
      // Process each line using the Gemini Playwright API
      for (let i = 0; i < codeLines.length; i++) {
        const line = codeLines[i];
        
        try {
          // Call the existing Playwright analysis API
          const response = await fetch(`/api/gemini/playwright?fixtureId=${fixtureId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "analyze", playwrightCode: line }),
          });

          let errorData;
          
          if (!response.ok) {
            const errorText = await response.text();
            
            // Try to parse as JSON, fall back to text if not valid JSON
            try { errorData = JSON.parse(errorText); } 
            catch { errorData = { error: errorText }; }
            
            // Handle fixture not found separately (stop processing)
            if (errorData.error === "Fixture not found") {
              const message = errorData.suggestion 
                ? `Fixture with ID ${fixtureId} not found. ${errorData.suggestion}`
                : `Fixture with ID ${fixtureId} not found. Please reload the page.`;
              
              toast.error(message);
              break; // Stop processing further lines
            }
            
            // Handle other errors
            toast.error(`Failed to analyze line ${i+1}: ${errorData.error || 'Unknown error'}`);
            failureCount++;
            continue;
          }

          const result = await response.json();
          if (result && result.success) {
            successCount++;
          } else {
            failureCount++;
            toast.error(`Failed to create step from line ${i+1}`);
          }
        } catch (error) {
          failureCount++;
          toast.error(`Error processing line ${i+1}`);
        }
      }
      
      // Refresh steps to show the new additions
      await refreshSteps();
      
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
    } catch (error) {
      toast.error(`Failed to import code with AI`);
    } finally {
      setIsProcessingCode(false);
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 sm:px-6 md:px-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading fixture details...</p>
        </div>
      </div>
    );
  }

  if (error || !fixture) {
    return (
      <div className="container px-4 py-6 sm:px-6 md:px-8">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <p className="text-4xl font-bold text-muted-foreground">404</p>
            <p className="text-red-500 text-lg">{error || "Fixture not found"}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/projects/${projectId}/fixtures`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Fixtures
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 sm:px-6 md:px-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold">
            {editMode ? "Edit Fixture" : fixture.name}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/projects/${params.id}/fixtures`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Fixtures
            </Link>
          </Button>
          {!editMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit Fixture</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleCloneFixture}
                  disabled={isSaving}
                >
                  <Copy className="h-4 w-4" />
                  {isSaving && <span className="ml-2">...</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clone Fixture</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            {editMode ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Fixture Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={editedFixture?.name || ""}
                    onChange={handleFixtureInputChange}
                    className="mt-1"
                    placeholder="Enter fixture name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={editedFixture?.description || ""}
                    onChange={handleFixtureInputChange}
                    className="mt-1"
                    placeholder="Enter fixture description"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={editedFixture?.type || ""}
                    onValueChange={(value) => handleFixtureTypeChange(value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="data">Data</SelectItem>
                      <SelectItem value="config">Configuration</SelectItem>
                      <SelectItem value="environment">Environment</SelectItem>
                      <SelectItem value="setup">Setup</SelectItem>
                      <SelectItem value="cleanup">Cleanup</SelectItem>
                    </SelectContent>
                  </Select>
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
                          onClick={handleSaveFixture}
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
                    Type
                  </h3>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100`}
                    >
                      {fixture.type}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Created Date
                  </h3>
                  <p className="mt-1">
                    {formatDate(new Date(fixture.createdAt))}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Updated At
                  </h3>
                  <p className="mt-1">
                    {fixture.updatedAt
                      ? formatDate(new Date(fixture.updatedAt))
                      : "Not updated yet"}
                  </p>
                </div>
                {fixture.description && (
                  <div className="md:col-span-3">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Description
                    </h3>
                    <p className="mt-1">{fixture.description}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fixture Steps Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold">Fixture Steps</h2>
          <div className="text-sm text-muted-foreground">
            {steps.length} steps
          </div>

          {/* Show delete selected button when steps are selected */}
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
          {/* Only show when not in edit mode */}
          {!editMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportWithAI(true)}
              >
                <BrainCircuit className="h-4 w-4 mr-2" />
                Import with AI
              </Button>
            
              <Button
                variant="default"
                size="sm"
                onClick={handleAddStep}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </>
          )}
        </div>
      </div>

      {!editMode && steps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">
              No fixture steps defined yet
            </p>
            <Button onClick={handleAddStep}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Step
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <TestStepsTable
              testSteps={steps.map(step => ({
                id: step.id,
                action: step.action,
                data: step.data || null,
                expected: step.expected || null,
                playwrightCode: step.playwrightCode || null,
                order: step.order,
                disabled: step.disabled,
                createdAt: step.createdAt,
                updatedAt: step.updatedAt,
                testCaseId: fixtureId, // Use fixtureId as testCaseId
              }))}
              onReorder={handleReorderSteps}
              onEdit={handleEditStep}
              onDelete={handleDeleteStep}
              onToggleDisable={handleToggleDisableStep}
              onClone={handleCloneStep}
              selectedSteps={selectedSteps}
              onSelectStep={handleSelectStep}
              selectAll={selectAll}
              onSelectAll={handleSelectAllSteps}
            />
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Step Dialog */}
      <Dialog open={isAddStepOpen} onOpenChange={setIsAddStepOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditStep ? "Edit Fixture Step" : "Add Fixture Step"}
            </DialogTitle>
            <DialogDescription>
              {isEditStep
                ? "Update the details of this fixture step"
                : "Enter the details for the new fixture step"}
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
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="disabled"
                  checked={newStep.disabled}
                  onCheckedChange={handleStepDisabledChange}
                />
                <Label htmlFor="disabled">
                  Disable this step (will be skipped during execution)
                </Label>
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import with AI Dialog */}
      <Dialog open={showImportWithAI} onOpenChange={setShowImportWithAI}>
        <DialogContent className="max-w-3xl import-ai-dialog-content">
          <DialogHeader>
            <DialogTitle>Import Playwright Code with AI</DialogTitle>
            <DialogDescription>
              Paste your Playwright code below, and AI will analyze and create fixture steps from it.
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
                    The AI will analyze each Playwright command and create appropriate fixture steps.
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
    </div>
  );
} 