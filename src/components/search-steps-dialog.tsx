import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
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
import { useStepSearch } from "@/hooks/useStepSearch";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Search, Plus } from "lucide-react";

interface SearchStepsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  testCaseId: string;
  onStepAdded: (newStep: any) => void;
  onUpdatePlaywright: (step: any, action: string) => Promise<void>;
}

interface TestCaseOption {
  id: string;
  name: string;
}

const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "navigate", label: "Navigate" },
  { value: "click", label: "Click" },
  { value: "fill", label: "Fill" },
  { value: "select", label: "Select" },
  { value: "check", label: "Check" },
  { value: "uncheck", label: "Uncheck" },
  { value: "wait", label: "Wait" },
];

export function SearchStepsDialog({
  open,
  onOpenChange,
  projectId,
  testCaseId,
  onStepAdded,
  onUpdatePlaywright,
}: SearchStepsDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("search");
  const [selectedTestCase, setSelectedTestCase] = useState<string>("all");
  const [selectedActionType, setSelectedActionType] = useState<string>("all");
  const [testCases, setTestCases] = useState<TestCaseOption[]>([]);
  const [isLoadingTestCases, setIsLoadingTestCases] = useState(false);

  // Khởi tạo hook tìm kiếm
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isLoading,
    cloneTestStep,
  } = useStepSearch({
    projectId,
    testCaseId: selectedTestCase !== "all" ? selectedTestCase : undefined,
    actionType: selectedActionType !== "all" ? selectedActionType : undefined,
  });

  // Lấy danh sách test cases khi dialog mở
  useEffect(() => {
    if (open) {
      fetchTestCases();
    }
  }, [open, projectId]);

  // Hàm lấy danh sách test cases
  const fetchTestCases = async () => {
    setIsLoadingTestCases(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/test-cases`);
      if (!response.ok) {
        throw new Error("Failed to fetch test cases");
      }
      const data = await response.json();
      setTestCases(data.map((tc: any) => ({ id: tc.id, name: tc.name })));
    } catch (error) {
      console.error("Error fetching test cases:", error);
      toast.error("Failed to load test cases");
    } finally {
      setIsLoadingTestCases(false);
    }
  };

  // Xử lý chọn test step để thêm vào test case
  const handleSelectStep = async (step: any) => {
    try {
      const clonedStep = await cloneTestStep(testCaseId, step.id);
      onStepAdded(clonedStep);

      // Cập nhật Playwright test file
      await onUpdatePlaywright(clonedStep, "add");

      toast.success("Test step added successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding test step:", error);
      toast.error("Failed to add test step");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Existing Test Steps</DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="search"
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="search">Search Steps</TabsTrigger>
          </TabsList>

          <TabsContent
            value="search"
            className="flex-1 overflow-hidden flex flex-col"
          >
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex gap-2 flex-1">
                  <Input
                    placeholder="Search test steps..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                    prefix={
                      <Search className="h-4 w-4 text-muted-foreground" />
                    }
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select
                    value={selectedTestCase}
                    onValueChange={setSelectedTestCase}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filter by Test Case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Test Cases</SelectItem>
                      {testCases.map((tc) => (
                        <SelectItem key={tc.id} value={tc.id}>
                          {tc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedActionType}
                    onValueChange={setSelectedActionType}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by Action" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border flex-1 overflow-auto">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full min-h-[300px]">
                    <Spinner size="lg" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[25%]">Action</TableHead>
                        <TableHead className="w-[25%]">Data</TableHead>
                        <TableHead className="w-[25%]">Expected</TableHead>
                        <TableHead className="w-[15%]">Test Case</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((step) => (
                        <TableRow key={step.id}>
                          <TableCell className="truncate max-w-[200px]">
                            {step.action}
                          </TableCell>
                          <TableCell className="truncate max-w-[200px]">
                            {step.data}
                          </TableCell>
                          <TableCell className="truncate max-w-[200px]">
                            {step.expected}
                          </TableCell>
                          <TableCell className="truncate max-w-[150px]">
                            {step.testCase.name}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleSelectStep(step)}
                            >
                              <Plus className="h-4 w-4 mr-1" /> Add
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center p-4 text-muted-foreground min-h-[300px] flex items-center justify-center">
                    {searchQuery
                      ? "No test steps found"
                      : "Enter a keyword to search for test steps"}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
