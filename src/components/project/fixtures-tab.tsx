import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
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
  Plus,
  Edit,
  Trash2,
  List,
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
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Fixture {
  id: string;
  name: string;
  description: string | null;
  type: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  content: string | null;
  steps: number;
}

interface FixturesTabProps {
  projectId: string;
}

export function FixturesTab({ projectId }: FixturesTabProps) {
  const router = useRouter();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [createdAtFilter, setCreatedAtFilter] = useState<Date | undefined>();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showFixtureDialog, setShowFixtureDialog] = useState(false);
  const [newFixture, setNewFixture] = useState<{
    name: string;
    type: string;
    description: string;
    content: string;
    tags: string;
  }>({
    name: "",
    type: "data",
    description: "",
    content: "",
    tags: ""
  });
  const [editingFixture, setEditingFixture] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const itemsPerPage = 10;

  // Fetch fixtures when component mounts
  useEffect(() => {
    fetchFixtures();
  }, [projectId]);

  const fetchFixtures = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/fixtures`);
      if (!response.ok) {
        throw new Error("Failed to fetch fixtures");
      }
      const data = await response.json();
      
      // Parse tags from string to array
      const parsedData = data.map((fixture: any) => ({
        ...fixture,
        tags: fixture.tags ? fixture.tags.split(',') : [],
        steps: 0 // Default to 0, we'll update after fetching steps
      }));

      // Fetch steps count for each fixture (without awaiting here)
      const fixtureCounts = parsedData.map(async (fixture: Fixture) => {
        try {
          const stepsResponse = await fetch(`/api/projects/${projectId}/fixtures/${fixture.id}/steps`);
          if (stepsResponse.ok) {
            const stepsData = await stepsResponse.json();
            return { id: fixture.id, count: stepsData.length };
          }
          return { id: fixture.id, count: 0 };
        } catch (error) {
          console.error(`Error fetching steps for fixture ${fixture.id}:`, error);
          return { id: fixture.id, count: 0 };
        }
      });
      
      // Wait for all step counts to be fetched
      const stepCounts = await Promise.all(fixtureCounts);
      
      // Update fixtures with step counts
      const fixuresWithSteps = parsedData.map((fixture: Fixture) => {
        const stepData = stepCounts.find(s => s.id === fixture.id);
        return {
          ...fixture,
          steps: stepData?.count || 0
        };
      });
      
      setFixtures(fixuresWithSteps);
    } catch (error) {
      console.error("Error fetching fixtures:", error);
      toast.error("Failed to load fixtures");
    } finally {
      setLoading(false);
    }
  };

  // Get unique tags from all fixtures
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    fixtures.forEach((fixture) => {
      fixture.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [fixtures]);

  // Get unique types from all fixtures
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    fixtures.forEach((fixture) => {
      types.add(fixture.type);
    });
    return Array.from(types);
  }, [fixtures]);

  // Filter fixtures based on search query and filters
  const filteredFixtures = useMemo(() => {
    return fixtures.filter((fixture) => {
      // Search filter
      const searchMatch =
        searchQuery === "" ||
        fixture.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (fixture.description?.toLowerCase() || "").includes(searchQuery.toLowerCase());

      // Type filter
      const typeMatch =
        typeFilter === "all" || fixture.type === typeFilter;

      // Tags filter
      const tagsMatch =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => fixture.tags?.includes(tag));

      // Created At filter
      const createdAtMatch =
        !createdAtFilter ||
        format(new Date(fixture.createdAt), "yyyy-MM-dd") ===
          format(createdAtFilter, "yyyy-MM-dd");

      return (
        searchMatch &&
        typeMatch &&
        tagsMatch &&
        createdAtMatch
      );
    });
  }, [
    fixtures,
    searchQuery,
    typeFilter,
    selectedTags,
    createdAtFilter,
  ]);

  // Reset to first page when filters change
  const resetPage = () => setCurrentPage(1);

  // Calculate pagination
  const totalItems = filteredFixtures.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFixtures = filteredFixtures.slice(startIndex, endIndex);

  // Handle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    resetPage();
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSelectedTags([]);
    setCreatedAtFilter(undefined);
    setCurrentPage(1);
  };

  // Check if there are any active filters
  const hasActiveFilters =
    searchQuery ||
    typeFilter !== "all" ||
    selectedTags.length > 0 ||
    createdAtFilter;

  // Handle input change for new fixture form
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewFixture((prev) => ({ ...prev, [name]: value }));
  };

  // Handle select change for fixture type
  const handleTypeChange = (value: string) => {
    setNewFixture((prev) => ({ ...prev, type: value }));
  };

  // Handle creating or updating a fixture
  const handleSubmitFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newFixture.name.trim()) {
      toast.error("Fixture name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Prepare the fixture data - only send required fields
      const fixtureData = {
        name: newFixture.name,
        type: newFixture.type,
        description: newFixture.description || undefined,
        content: newFixture.content || undefined,
        tags: newFixture.tags ? newFixture.tags.split(',').map(tag => tag.trim()).filter(Boolean).join(',') : undefined
      };
      
      let response;
      
      if (editingFixture) {
        // Update existing fixture
        response = await fetch(`/api/projects/${projectId}/fixtures/${editingFixture}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fixtureData),
        });
      } else {
        // Create new fixture
        response = await fetch(`/api/projects/${projectId}/fixtures`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fixtureData),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save fixture');
      }

      setShowFixtureDialog(false);
      setNewFixture({
        name: "",
        description: "",
        type: "data",
        content: "",
        tags: ""
      });
      setEditingFixture(null);
      fetchFixtures();
      
      toast.success(editingFixture ? 'Fixture updated successfully' : 'Fixture created successfully');
    } catch (error) {
      console.error('Error saving fixture:', error);
      toast.error('Failed to save fixture');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle editing a fixture
  const handleEditFixture = (fixture: Fixture) => {
    router.push(`/projects/${projectId}/fixtures/${fixture.id}/edit`);
  };

  // Handle deleting a fixture
  const handleDeleteFixture = async (fixtureId: string) => {
    if (!confirm("Are you sure you want to delete this fixture?")) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete fixture');
      }

      fetchFixtures();
      toast.success('Fixture deleted successfully');
    } catch (error) {
      console.error('Error deleting fixture:', error);
      toast.error('Failed to delete fixture');
    }
  };

  // Handle navigating to fixture steps
  const handleManageFixtureSteps = (fixtureId: string, fixtureName: string) => {
    router.push(`/projects/${projectId}/fixtures/${fixtureId}/steps`);
  };

  if (loading) {
    return <div className="py-10 text-center">Loading fixtures...</div>;
  }

  if (fixtures.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No fixtures found for this project.
        </p>
        <Button 
          asChild
          className="mt-4"
        >
          <Link href={`/projects/${projectId}/fixtures/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Fixture
          </Link>
        </Button>
      </div>
    );
  }

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
                    {filteredFixtures.length} results
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
                  {/* Search, Type and Tags Filter Group */}
                  <div className="flex-1 flex flex-col sm:flex-row gap-3 flex-wrap">
                    {/* Search and Type Filter Container */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Search Input */}
                      <div className="relative w-[220px]">
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                        <Input
                          placeholder="Search fixtures..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            resetPage();
                          }}
                          className="pl-8 w-full h-8 text-sm"
                        />
                      </div>

                      {/* Type Filter */}
                      <div className="w-[220px] relative">
                        <Select
                          value={typeFilter}
                          onValueChange={(value) => {
                            setTypeFilter(value);
                            resetPage();
                          }}
                        >
                          <SelectTrigger className="w-full h-8 text-sm py-0 px-3">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {availableTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
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

      {/* Table and rest of the content */}
      {filteredFixtures.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No fixtures match your filters.
          </p>
        </div>
      ) : (
        <div className="rounded-md border" style={{ width: "100%" }}>
          <div className="overflow-x-auto" style={{ minWidth: "100%" }}>
            <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "30%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium border">
                    Name
                  </th>
                  <th className="px-4 py-2 text-center font-medium border">
                    Type
                  </th>
                  <th className="px-4 py-2 text-center font-medium border">
                    Created
                  </th>
                  <th className="px-4 py-2 text-center font-medium border">
                    Steps
                  </th>
                  <th className="px-4 py-2 text-center font-medium border">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentFixtures.map((fixture) => (
                  <tr
                    key={fixture.id}
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onDoubleClick={() =>
                      router.push(
                        `/projects/${projectId}/fixtures/${fixture.id}/steps`
                      )
                    }
                    title="Double-click to manage steps"
                  >
                    <td className="px-4 py-2 border">
                      <div>
                        <div className="font-medium">{fixture.name}</div>
                        <div className="text-muted-foreground text-xs line-clamp-1">
                          {fixture.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 border text-center">
                      <div className="inline-block rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        {fixture.type}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap border text-center">
                      {formatDate(new Date(fixture.createdAt))}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center border">
                      {fixture.steps || 0}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center border">
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageFixtureSteps(fixture.id, fixture.name);
                          }}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditFixture(fixture);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFixture(fixture.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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