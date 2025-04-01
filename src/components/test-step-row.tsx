import React, { useState, useEffect } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, GripVertical, EyeOff, Eye, Copy, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TestStep, TestStepRowProps } from "@/types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function TestStepRow({
  id,
  step,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleDisable,
  onClone,
}: TestStepRowProps) {
  const [showDataDialog, setShowDataDialog] = useState(false);
  const [truncatedData, setTruncatedData] = useState("");

  // Xử lý cắt data xuống 100 ký tự khi component mount và khi data thay đổi
  useEffect(() => {
    if (step.data) {
      setTruncatedData(
        step.data.length > 100 ? step.data.substring(0, 100) + "..." : step.data
      );
    } else {
      setTruncatedData("");
    }
  }, [step.data]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id || step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasLongData = step.data && step.data.length > 100;

  return (
    <>
      <div className="flex items-center justify-end space-x-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(step.id)}
          className="h-8 w-8"
          title="Edit step"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onClone(step)}
          className="h-8 w-8"
          title="Clone step"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleDisable(step.id, !step.disabled)}
          className="h-8 w-8"
          title={step.disabled ? "Enable step" : "Disable step"}
        >
          {step.disabled ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(step.id)}
          className="h-8 w-8"
          title="Delete step"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Dialog hiển thị dữ liệu đầy đủ */}
      <Dialog open={showDataDialog} onOpenChange={setShowDataDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Dữ liệu đầy đủ</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="whitespace-pre-wrap break-all bg-muted/30 p-4 rounded-md overflow-auto max-h-[400px]">
              {step.data || ""}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowDataDialog(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
