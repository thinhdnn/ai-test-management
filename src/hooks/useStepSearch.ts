import { useState, useEffect } from "react";
import { toast } from "sonner";

// Debounce hook để trì hoãn tìm kiếm
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Interface cho test step
interface TestStep {
  id: string;
  action: string;
  data: string | null;
  expected: string | null;
  selector: string | null;
  playwrightCode: string | null;
  disabled: boolean;
  order: number;
  testCase: {
    id: string;
    name: string;
  };
}

interface UseStepSearchProps {
  projectId: string;
  testCaseId?: string;
  actionType?: string;
}

export function useStepSearch({
  projectId,
  testCaseId,
  actionType,
}: UseStepSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TestStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    async function fetchSearchResults() {
      if (!projectId) return;

      setIsLoading(true);
      try {
        // Xây dựng URL cho tìm kiếm
        let url = `/api/projects/${projectId}/test-steps/search?q=${encodeURIComponent(
          debouncedSearch
        )}`;

        if (testCaseId) {
          url += `&testCaseId=${testCaseId}`;
        }

        if (actionType) {
          url += `&actionType=${actionType}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Error searching test steps:", error);
        toast.error("Failed to search test steps");
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSearchResults();
  }, [debouncedSearch, projectId, testCaseId, actionType]);

  const cloneTestStep = async (
    targetTestCaseId: string,
    sourceStepId: string
  ) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-cases/${targetTestCaseId}/steps/clone`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceStepId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to clone test step");
      }

      return await response.json();
    } catch (error) {
      console.error("Error cloning test step:", error);
      toast.error("Failed to clone test step");
      throw error;
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isLoading,
    cloneTestStep,
  };
}
