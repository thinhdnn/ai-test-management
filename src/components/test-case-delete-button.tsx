"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface TestCaseDeleteButtonProps {
  projectId: string;
  testCaseId: string;
  testCaseName: string;
  redirectToProject?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  refreshTestCases?: () => Promise<void>;
}

export function TestCaseDeleteButton({
  projectId,
  testCaseId,
  testCaseName,
  redirectToProject = false,
  size,
  onClick,
  title = "Delete",
  refreshTestCases,
}: TestCaseDeleteButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      // Call API to delete test case
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${testCaseId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Error deleting test case");
      }

      // Close dialog
      setIsOpen(false);

      // Show success message
      toast.success("Test case deleted successfully");

      if (redirectToProject) {
        // Redirect to project page if on test case detail page
        router.push(`/projects/${projectId}`);
      } else {
        // Refresh page if on list page
        if (refreshTestCases) {
          await refreshTestCases();
        } else {
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Error deleting test case:", error);
      toast.error("Unable to delete test case. Please try again later.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if on test case detail page based on redirectToProject
  const isDetailPage = redirectToProject === true;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {isDetailPage ? (
          <Button
            variant="outline"
            size="default"
            className="h-10 px-4 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        ) : (
          <Button
            variant="ghost"
            size={size || "icon"}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title={title}
            onClick={(e) => {
              if (onClick) onClick(e);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Test Case Deletion</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the test case "{testCaseName}"?
          </DialogDescription>
          <div className="mt-2 font-semibold text-destructive">
            This action cannot be undone. All test steps will be permanently
            deleted.
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
