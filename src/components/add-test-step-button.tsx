"use client";

import { Button } from "@/components/ui/button";
import { ButtonProps } from "@/components/ui/button";
import {
  ShortcutTooltip,
  formatShortcut,
} from "@/components/ui/shortcut-tooltip";
import { Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import * as React from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { GeminiTestStepResponse } from "@/types";

interface AddTestStepButtonProps extends ButtonProps {
  isFirstStep?: boolean;
}

export function AddTestStepButton({
  isFirstStep = false,
  className,
  onClick,
  ...props
}: AddTestStepButtonProps) {
  const [isMac, setIsMac] = useState(false);
  // Add state for AI dialog
  const [isAIDialogOpen, setIsAIDialogOpen] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedStep, setGeneratedStep] =
    React.useState<GeminiTestStepResponse | null>(null);

  // Get params to use project and test case information
  const params = useParams<{ id: string; testCaseId: string }>();

  useEffect(() => {
    // Determine if user is on Mac
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
    console.log(
      "AddTestStepButton rendered with data-test-id: add-test-step-button"
    );
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("AddTestStepButton clicked directly");
    if (onClick) onClick(e);
  };

  // Handle when user clicks generate with AI button (legacy)
  const handleGenerateWithAI = async () => {
    if (!description.trim()) {
      toast.error("Please enter a description for the test step");
      return;
    }

    try {
      setIsGenerating(true);
      const response = await fetch("/api/gemini/generate-test-step", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Unable to generate test step with AI"
        );
      }

      const result = await response.json();
      setGeneratedStep(result);
      toast.success("Test step successfully generated with Gemini AI");
    } catch (error) {
      console.error("Error generating test step with AI:", error);
      toast.error("Unable to generate test step with AI");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle when user applies generated test step
  const handleApplyGeneratedStep = () => {
    if (generatedStep) {
      // Customize data to match the format of the current form
      // Assume parent component will need this data to create test step
      const customEvent = new CustomEvent("aiGeneratedStep", {
        detail: {
          action: generatedStep.action,
          data: generatedStep.data || "",
          expected: generatedStep.expected || "",
          disabled: false, // Default to not disabled
        },
      });

      // Trigger event and pass data
      document.dispatchEvent(customEvent);

      // Close dialog and call onClick to open add step form
      setIsAIDialogOpen(false);

      // Call onClick callback to open add step form
      if (onClick) {
        const event = new MouseEvent("click") as any;
        onClick(event);
      }

      // Reset state
      setDescription("");
      setGeneratedStep(null);

      // Show notification
      toast.success("Test step created with AI. Please confirm to save");
    }
  };

  return (
    <>
      <div className="flex space-x-2">
        <ShortcutTooltip
          shortcut={isMac ? "⌘⇧ A" : "Ctrl+Shift+A"}
          side="bottom"
        >
          <Button
            onClick={onClick}
            variant={isFirstStep ? "default" : "outline"}
            data-test-id="add-test-step-button"
            {...props}
          >
            <Plus className="mr-2 h-4 w-4" />
            {isFirstStep ? "Add First Step" : "Add Step"}
          </Button>
        </ShortcutTooltip>
      </div>

      {/* Dialog for creating test step with AI - no longer used */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Test Step with Gemini AI</DialogTitle>
            <DialogDescription>
              Describe the action you want to perform and AI will create a
              corresponding test step.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ai-description">
                Detailed Action Description
              </Label>
              <Textarea
                id="ai-description"
                placeholder="Example: Click the login button after filling in username and password"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {generatedStep && (
              <div className="border rounded-md p-4 space-y-3 bg-muted/20">
                <div className="flex justify-between">
                  <h4 className="font-medium">Suggested Test Step</h4>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Action:</span>
                    <span className="ml-2">{generatedStep.action}</span>
                  </div>

                  {generatedStep.data && (
                    <div>
                      <span className="text-sm font-medium">Data:</span>
                      <span className="ml-2">{generatedStep.data}</span>
                    </div>
                  )}

                  {generatedStep.expected && (
                    <div>
                      <span className="text-sm font-medium">
                        Expected Result:
                      </span>
                      <span className="ml-2">{generatedStep.expected}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-medium">
                      Playwright code:
                    </span>
                    <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                      {generatedStep.playwrightCode}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAIDialogOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>

            {!generatedStep ? (
              <Button
                onClick={handleGenerateWithAI}
                disabled={isGenerating || !description.trim()}
              >
                {isGenerating ? "Generating..." : "Generate with AI"}
              </Button>
            ) : (
              <Button onClick={handleApplyGeneratedStep}>Apply & Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
