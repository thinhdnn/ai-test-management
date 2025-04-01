"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, BROWSER_OPTIONS, ENVIRONMENT_OPTIONS } from "@/lib/utils";
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
import { toast } from "sonner";
import { ProjectDeleteButton } from "@/components/project-delete-button";
import { TestCaseDeleteButton } from "@/components/test-case-delete-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RunTestButton } from "@/components/run-test-button";
import { RunAllTestsButton } from "@/components/run-all-tests-button";
import { useRouter } from "next/navigation";
import { TestCaseWorklist } from "@/components/project/test-case-worklist";

// Types
interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  browser: string;
  environment: string;
  library: string | null;
  createdAt: string;
  updatedAt: string;
  created_by: string | null;
  created_by_username: string | null;
  lastRunBy: string | null;
  lastRunBy_username: string | null;
  testCases: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
  };
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  lastRun: string | null;
  tags: string[];
  steps: number;
}

// Thêm interface cho fixture
interface FixtureData {
  name: string;
  type: string;
  description: string;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  // @next-codemod-ignore -- Client component can use params synchronously
  const projectId = params.id;

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch test cases
    const fetchTestCases = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}/test-cases`);
        if (!response.ok) {
          throw new Error("Failed to fetch test cases");
        }
        const data = await response.json();
        setTestCases(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTestCases();
  }, [projectId]);

  // Hàm refresh test cases
  const refreshTestCases = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/test-cases`);
      if (!response.ok) {
        throw new Error("Failed to fetch test cases");
      }
      const data = await response.json();
      setTestCases(data);
      toast.success("Test status refreshed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to refresh test status");
    }
  };

  // Thêm event listener để component chính có thể lắng nghe sự kiện từ RunAllTestsButton
  useEffect(() => {
    const handleRefreshTestCases = () => {
      refreshTestCases();
    };

    document.addEventListener("refreshTestCases", handleRefreshTestCases);

    return () => {
      document.removeEventListener("refreshTestCases", handleRefreshTestCases);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading test cases...</p>
      </div>
    );
  }

  return (
    <TestCaseWorklist
      projectId={projectId}
      testCases={testCases}
      refreshTestCases={refreshTestCases}
    />
  );
}
