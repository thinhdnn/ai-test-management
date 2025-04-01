import React, { useState, useEffect } from "react";
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TestStepRow } from "./test-step-row";
import { toast } from "sonner";
import { TestStep, TestStepsTableProps } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff, 
  GripVertical, 
  Copy 
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TestStepsTableProps {
  testSteps: TestStep[];
  onReorder: (steps: TestStep[]) => void;
  onEdit: (stepId: string) => void;
  onDelete: (stepId: string) => void;
  onToggleDisable: (stepId: string, disabled: boolean) => void;
  onClone: (step: TestStep) => void;
  selectedSteps?: string[];
  onSelectStep?: (stepId: string, checked: boolean) => void;
  selectAll?: boolean;
  onSelectAll?: (checked: boolean) => void;
}

export function TestStepsTable({
  testSteps,
  onReorder,
  onEdit,
  onDelete,
  onToggleDisable,
  onClone,
  selectedSteps = [],
  onSelectStep = () => {},
  selectAll = false,
  onSelectAll = () => {},
}: TestStepsTableProps) {
  const [items, setItems] = useState<TestStep[]>([]);
  const [draggedStep, setDraggedStep] = useState<TestStep | null>(null);

  // Initialize items from testSteps
  useEffect(() => {
    setItems(testSteps);
  }, [testSteps]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, step: TestStep) => {
    setDraggedStep(step);
    e.dataTransfer.setData("text/plain", step.id);
    e.currentTarget.classList.add("opacity-50");
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-muted");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove("bg-muted");
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetStep: TestStep) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-muted");
    
    if (!draggedStep || draggedStep.id === targetStep.id) return;

    const updatedSteps = [...testSteps];
    const draggedIndex = updatedSteps.findIndex(s => s.id === draggedStep.id);
    const targetIndex = updatedSteps.findIndex(s => s.id === targetStep.id);
    
    // Remove dragged item
    const [draggedItem] = updatedSteps.splice(draggedIndex, 1);
    
    // Insert at target position
    updatedSteps.splice(targetIndex, 0, draggedItem);
    
    // Update order property
    const reorderedSteps = updatedSteps.map((step, index) => ({
      ...step,
      order: index + 1
    }));
    
    // Call onReorder callback with updated steps
    onReorder(reorderedSteps);
    
    setDraggedStep(null);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove("opacity-50");
    // Clean up any drag-over classes that might be left
    document.querySelectorAll(".bg-muted").forEach(el => {
      el.classList.remove("bg-muted");
    });
    setDraggedStep(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox 
                checked={selectAll}
                onCheckedChange={onSelectAll}
                aria-label="Select all test steps"
              />
            </TableHead>
            <TableHead className="w-14">#</TableHead>
            <TableHead className="w-8"></TableHead>
            <TableHead className="w-1/4">Action</TableHead>
            <TableHead className="w-1/4">Data</TableHead>
            <TableHead className="w-1/4">Expected Result</TableHead>
            <TableHead className="w-20">Status</TableHead>
            <TableHead className="text-right w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext
            items={items.map((step) => step.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((step) => (
              <TableRow 
                key={step.id}
                draggable
                onDragStart={(e) => handleDragStart(e, step)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, step)}
                onDragEnd={handleDragEnd}
                className={step.disabled ? "opacity-50" : ""}
                data-test-id={`test-step-${step.order}`}
              >
                <TableCell>
                  <Checkbox 
                    checked={selectedSteps.includes(step.id)} 
                    onCheckedChange={(checked) => onSelectStep(step.id, !!checked)}
                    aria-label={`Select step ${step.order}`}
                  />
                </TableCell>
                <TableCell>{step.order}</TableCell>
                <TableCell>
                  <div className="cursor-grab">
                    <GripVertical size={16} className="text-muted-foreground" />
                  </div>
                </TableCell>
                <TableCell>{step.action}</TableCell>
                <TableCell className="data-cell">{step.data || "-"}</TableCell>
                <TableCell className="data-cell">{step.expected || "-"}</TableCell>
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
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onToggleDisable(step.id, !step.disabled)}
                          >
                            {step.disabled ? <Eye size={16} /> : <EyeOff size={16} />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{step.disabled ? "Enable" : "Disable"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onClone(step)}
                          >
                            <Copy size={16} />
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onEdit(step.id)}
                          >
                            <Pencil size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onDelete(step.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </SortableContext>
        </TableBody>
      </Table>
    </DndContext>
  );
}
