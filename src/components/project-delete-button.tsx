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

interface ProjectDeleteButtonProps {
  projectId: string;
  projectName: string;
  redirectToProjects?: boolean;
}

export function ProjectDeleteButton({
  projectId,
  projectName,
  redirectToProjects = false,
}: ProjectDeleteButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      // Call API to delete project
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error deleting project");
      }

      // Close dialog
      setIsOpen(false);

      // Show success notification
      toast.success("Project deleted successfully");

      if (redirectToProjects) {
        // Redirect to projects page if currently on detail page
        router.push("/projects");
      } else {
        // Refresh the page if currently on list page
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Could not delete the project. Please try again later.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 group"
        >
          <Trash2 className="h-4 w-4" />
          <span className="absolute left-full ml-2 hidden group-hover:inline-block whitespace-nowrap">
            Delete
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Project Deletion</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the project "{projectName}"?
          </DialogDescription>
          <div className="mt-2 font-semibold text-destructive">
            This action cannot be undone. All test cases and test steps will be
            permanently deleted.
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
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
