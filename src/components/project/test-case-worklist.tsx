import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TestCaseDeleteButton } from "@/components/test-case-delete-button";
import { RunTestButton } from "@/components/run-test-button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Search,
  Filter,
  Tags as TagsIcon,
  ChevronDown,
  ChevronUp,
  CalendarIcon,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePermission } from "@/lib/hooks/usePermission";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

interface TestCase {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  lastRun: string | null;
  steps: number;
  tags: string[];
  isManual?: boolean;
  order?: number;
}

interface TestCaseWorklistProps {
  projectId: string;
  testCases: TestCase[];
  refreshTestCases: () => Promise<void>;
}

export function TestCaseWorklist({
  projectId,
  testCases,
  refreshTestCases,
}: TestCaseWorklistProps) {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [createdAtFilter, setCreatedAtFilter] = useState<Date | undefined>();
  const [lastRunFilter, setLastRunFilter] = useState<Date | undefined>();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showTestResult, setShowTestResult] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<string | null>(null);
  const [targetPosition, setTargetPosition] = useState<number>(1);
  const itemsPerPage = 10;

  // Kiểm tra quyền để biết người dùng có thể tạo test case hay không
  const canCreateTestCase = hasPermission("testcase.create");
  const canDeleteTestCase = hasPermission("testcase.delete");
  const canRunTestCase = hasPermission("testcase.run");

  // Get unique tags from all test cases
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    testCases.forEach((testCase) => {
      testCase.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [testCases]);

  // Filter test cases based on search query and filters
  const filteredTestCases = useMemo(() => {
    return testCases.filter((testCase) => {
      // Search filter
      const searchMatch =
        searchQuery === "" ||
        testCase.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        testCase.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const statusMatch =
        statusFilter === "all" || testCase.status === statusFilter;

      // Tags filter
      const tagsMatch =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => testCase.tags?.includes(tag));

      // Created At filter
      const createdAtMatch =
        !createdAtFilter ||
        format(new Date(testCase.createdAt), "yyyy-MM-dd") ===
          format(createdAtFilter, "yyyy-MM-dd");

      // Last Run filter
      const lastRunMatch =
        !lastRunFilter ||
        (testCase.lastRun &&
          format(new Date(testCase.lastRun), "yyyy-MM-dd") ===
            format(lastRunFilter, "yyyy-MM-dd"));

      return (
        searchMatch &&
        statusMatch &&
        tagsMatch &&
        createdAtMatch &&
        lastRunMatch
      );
    })
    // Sort by order field
    .sort((a, b) => {
      // Get order values (default to max value if not set)
      const orderA = a.order !== undefined ? a.order : Number.MAX_SAFE_INTEGER;
      const orderB = b.order !== undefined ? b.order : Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }, [
    testCases,
    searchQuery,
    statusFilter,
    selectedTags,
    createdAtFilter,
    lastRunFilter,
  ]);

  // Reset to first page when filters change
  const resetPage = () => setCurrentPage(1);

  // Calculate pagination
  const totalItems = filteredTestCases.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTestCases = filteredTestCases.slice(startIndex, endIndex);

  // Handle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    resetPage();
  };

  // Function to open move dialog
  const openMoveDialog = (testCaseId: string) => {
    setSelectedTestCase(testCaseId);
    
    // Find the current position to set as default
    const currentTestCase = currentTestCases.find(tc => tc.id === testCaseId);
    if (currentTestCase?.order) {
      setTargetPosition(currentTestCase.order);
    } else {
      setTargetPosition(1);
    }
    
    setShowMoveDialog(true);
  };

  // Function to handle test case reordering
  const handleMoveTestCase = async () => {
    if (!selectedTestCase || targetPosition < 1 || targetPosition > filteredTestCases.length) {
      return;
    }

    try {
      setIsReordering(true);
      
      // Find current index
      const currentIndex = currentTestCases.findIndex(tc => tc.id === selectedTestCase);
      if (currentIndex === -1) {
        setShowMoveDialog(false);
        return;
      }
      
      // Create a copy of all filtered test cases
      const allTestCases = [...filteredTestCases];
      
      // Get the test case to move
      const testCaseToMove = allTestCases[currentIndex];
      
      // Remove the test case from its current position
      allTestCases.splice(currentIndex, 1);
      
      // Calculate the target index (position - 1, as positions are 1-based)
      // Ensure it's within range
      const targetIndex = Math.min(Math.max(targetPosition - 1, 0), allTestCases.length);
      
      // Insert the test case at the target position
      allTestCases.splice(targetIndex, 0, testCaseToMove);
      
      // Update order values for all test cases
      const reorderedTestCases = allTestCases.map((tc, index) => ({
        id: tc.id,
        order: index + 1 // 1-based order
      }));
      
      // Call API to update order in the database
      const response = await fetch(`/api/projects/${projectId}/test-cases/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testCases: reorderedTestCases }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update test case order');
      }
      
      // Refresh test cases to get updated data
      await refreshTestCases();
      
    } catch (error) {
      console.error('Error reordering test cases:', error);
    } finally {
      setIsReordering(false);
      setShowMoveDialog(false);
    }
  };

  if (testCases.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No test cases found for this project.
        </p>
        {canCreateTestCase && (
          <Button asChild className="mt-4">
            <Link href={`/projects/${projectId}/test-cases/new`}>
              Create First Test Case
            </Link>
          </Button>
        )}
      </div>
    );
  }

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSelectedTags([]);
    setCreatedAtFilter(undefined);
    setLastRunFilter(undefined);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== "all" ||
    selectedTags.length > 0 ||
    createdAtFilter ||
    lastRunFilter;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3">
          <Collapsible
            open={isFiltersOpen}
            onOpenChange={setIsFiltersOpen}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Filter className="h-3.5 w-3.5" />
                <span className="font-medium">Search & Filters</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 text-xs py-0">
                    {filteredTestCases.length} results
                  </Badge>
                )}
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  {isFiltersOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
              <div className="space-y-3">
                {/* Main Filters Row */}
                <div className="flex flex-col lg:flex-row gap-3">
                  {/* Search, Status and Tags Filter Group */}
                  <div className="flex-1 flex flex-col sm:flex-row gap-3 flex-wrap">
                    {/* Search and Status Filter Container */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Search Input */}
                      <div className="relative w-[220px]">
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                        <Input
                          placeholder="Search test cases..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            resetPage();
                          }}
                          className="pl-8 w-full h-8 text-sm"
                        />
                      </div>

                      {/* Status Filter */}
                      <div className="w-[220px] relative">
                        <Select
                          value={statusFilter}
                          onValueChange={(value) => {
                            setStatusFilter(value);
                            resetPage();
                          }}
                        >
                          <SelectTrigger className="w-full h-8 text-sm py-0 px-3">
                            <SelectValue placeholder="All Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="passed">Passed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Created At Filter */}
                      <div className="w-[220px] relative">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "w-full justify-start text-left font-normal h-8 text-sm",
                                !createdAtFilter && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                              {createdAtFilter ? (
                                format(createdAtFilter, "PPP")
                              ) : (
                                <span>Created Date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={createdAtFilter}
                              onSelect={(date: Date | undefined) => {
                                setCreatedAtFilter(date);
                                resetPage();
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {createdAtFilter && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 absolute right-0 top-0"
                            onClick={() => {
                              setCreatedAtFilter(undefined);
                              resetPage();
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Last Run Filter */}
                      <div className="w-[220px] relative">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "w-full justify-start text-left font-normal h-8 text-sm",
                                !lastRunFilter && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                              {lastRunFilter ? (
                                format(lastRunFilter, "PPP")
                              ) : (
                                <span>Last Run Date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={lastRunFilter}
                              onSelect={(date: Date | undefined) => {
                                setLastRunFilter(date);
                                resetPage();
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {lastRunFilter && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 absolute right-0 top-0"
                            onClick={() => {
                              setLastRunFilter(undefined);
                              resetPage();
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Tags Filter */}
                      {availableTags.length > 0 && (
                        <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TagsIcon className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="hidden sm:inline text-xs">
                              Filter by:
                            </span>
                          </div>
                          <div className="flex-1 flex flex-wrap gap-1.5">
                            {availableTags.map((tag) => (
                              <Badge
                                key={tag}
                                variant={
                                  selectedTags.includes(tag)
                                    ? "default"
                                    : "outline"
                                }
                                className={`cursor-pointer hover:opacity-80 transition-opacity text-xs py-0.5 ${
                                  selectedTags.includes(tag) ? "shadow-sm" : ""
                                }`}
                                onClick={() => toggleTag(tag)}
                              >
                                {tag}
                                {selectedTags.includes(tag) && (
                                  <X
                                    className="ml-1 h-3 w-3 hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTag(tag);
                                    }}
                                  />
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clear Filters Button */}
                  {hasActiveFilters && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="h-8 text-xs"
                      >
                        <X className="h-3.5 w-3.5 mr-1.5" />
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Move Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Test Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetPosition">Move to position:</Label>
              <Input
                id="targetPosition"
                type="number"
                min={1}
                max={filteredTestCases.length}
                value={targetPosition}
                onChange={(e) => setTargetPosition(parseInt(e.target.value) || 1)}
              />
              <p className="text-sm text-muted-foreground">
                Enter a position between 1 and {filteredTestCases.length}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMoveDialog(false)}
              disabled={isReordering}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleMoveTestCase}
              disabled={isReordering}
            >
              {isReordering ? 'Moving...' : 'Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table and rest of the content */}
      {filteredTestCases.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No test cases match your filters.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-center font-medium border">
                    Order
                  </th>
                  <th className="px-4 py-2 text-center font-medium border">
                    Name
                  </th>
                  <th className="px-4 py-2 text-center font-medium border">
                    Status
                  </th>
                  <th className="px-4 py-2 text-center font-medium border">
                    Created
                  </th>
                  <th className="px-4 py-2 text-center font-medium border">
                    Last Run
                  </th>
                  <th className="px-4 py-2 text-center font-medium border">
                    Steps
                  </th>
                  <th className="px-4 py-2 text-center font-medium border">
                    Tags
                  </th>
                  <th className="px-4 py-2 text-center font-medium border">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentTestCases.map((testCase) => (
                  <tr
                    key={testCase.id}
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onDoubleClick={() =>
                      router.push(
                        `/projects/${projectId}/test-cases/${testCase.id}`
                      )
                    }
                    title="Double-click to view details"
                  >
                    <td className="px-4 py-2 border text-center">
                      <div className="flex items-center justify-center">
                        <span className="mr-2">{testCase.order || "-"}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openMoveDialog(testCase.id);
                              }}
                            >
                              Move to...
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                    <td className="px-4 py-2 border">
                      <div>
                        <div className="font-medium">{testCase.name}</div>
                        <div className="text-muted-foreground text-xs line-clamp-1">
                          {testCase.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 border text-center">
                      <div
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          testCase.status === "passed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : testCase.status === "failed"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                        }`}
                      >
                        {testCase.status === "passed"
                          ? "Passed"
                          : testCase.status === "failed"
                          ? "Failed"
                          : "Pending"}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap border text-center">
                      {formatDate(new Date(testCase.createdAt))}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap border text-center">
                      {testCase.lastRun
                        ? formatDate(new Date(testCase.lastRun))
                        : "Not run yet"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center border">
                      {testCase.steps}
                    </td>
                    <td className="px-4 py-2 border text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {testCase.tags?.map((tag) => (
                          <span
                            key={tag}
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              tag === "high"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                                : tag === "medium"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                                : tag === "low"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td
                      className="p-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(
                          `/projects/${projectId}/test-cases/${testCase.id}`
                        );
                      }}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        {canRunTestCase && (
                          <RunTestButton
                            projectId={projectId}
                            testCaseId={testCase.id}
                            size="icon"
                            variant="ghost"
                            onClick={(e) => e.stopPropagation()}
                            onTestRunComplete={() => refreshTestCases()}
                          />
                        )}
                        {canDeleteTestCase && (
                          <TestCaseDeleteButton
                            projectId={projectId}
                            testCaseId={testCase.id}
                            testCaseName={testCase.name}
                            size="icon"
                            title="Delete Test Case"
                            onClick={(e) => e.stopPropagation()}
                            refreshTestCases={refreshTestCases}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of{" "}
            {totalItems} entries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
