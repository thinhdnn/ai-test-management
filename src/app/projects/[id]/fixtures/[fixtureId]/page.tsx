"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, PlayIcon, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from "@/lib/hooks/usePermission";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Định nghĩa kiểu dữ liệu cho fixture
interface Fixture {
  id: string;
  name: string;
  description: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  created_by: string | null;
  created_by_username: string | null;
  updated_by: string | null;
  updated_by_username: string | null;
  filename: string;
  path: string;
  exportName: string;
  steps: FixtureStep[];
}

// Định nghĩa kiểu dữ liệu cho bước trong fixture
interface FixtureStep {
  id: string;
  fixtureId: string;
  order: number;
  action: string;
  data?: string;
  expected?: string;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function FixtureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const fixtureId = params.fixtureId as string;
  const { hasPermission } = usePermission();

  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedFixture, setEditedFixture] = useState<Partial<Fixture>>({});
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch fixture data
  useEffect(() => {
    const fetchFixture = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Fixture not found");
          } else {
            throw new Error("Failed to fetch fixture");
          }
          return;
        }
        
        const data = await response.json();
        setFixture(data);
        setEditedFixture({
          name: data.name,
          description: data.description,
          type: data.type
        });
      } catch (error) {
        console.error("Error fetching fixture:", error);
        setError("An error occurred while fetching the fixture");
      } finally {
        setLoading(false);
      }
    };

    fetchFixture();
  }, [projectId, fixtureId]);

  // Handle input changes for fixture editing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedFixture(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle select changes for fixture type
  const handleSelectChange = (name: string, value: string) => {
    setEditedFixture(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save edited fixture
  const handleSaveFixture = async () => {
    // Kiểm tra quyền cập nhật fixture
    if (!hasPermission("testcase.update")) {
      toast.error("You don't have permission to update fixtures");
      return;
    }
    
    try {
      setIsSaving(true);
      
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedFixture),
      });

      if (!response.ok) {
        throw new Error("Failed to update fixture");
      }

      const updatedFixture = await response.json();
      setFixture(updatedFixture);
      setEditMode(false);
      toast.success("Fixture updated successfully");
    } catch (error) {
      console.error("Error updating fixture:", error);
      toast.error("Failed to update fixture");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete fixture
  const handleDeleteFixture = async () => {
    // Kiểm tra quyền xóa fixture
    if (!hasPermission("testcase.delete")) {
      toast.error("You don't have permission to delete fixtures");
      return;
    }
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete fixture");
      }

      toast.success("Fixture deleted successfully");
      router.push(`/projects/${projectId}/fixtures`);
    } catch (error) {
      console.error("Error deleting fixture:", error);
      toast.error("Failed to delete fixture");
    } finally {
      setIsDeleting(false);
      setIsConfirmDialogOpen(false);
    }
  };

  // Clone fixture
  const handleCloneFixture = async () => {
    // Kiểm tra quyền tạo fixture
    if (!hasPermission("testcase.create")) {
      toast.error("You don't have permission to clone fixtures");
      return;
    }
    
    try {
      toast.info("Cloning fixture...");
      
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureId}/clone`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to clone fixture");
      }

      const clonedFixture = await response.json();
      toast.success("Fixture cloned successfully");
      
      // Navigate to the new fixture
      router.push(`/projects/${projectId}/fixtures/${clonedFixture.id}`);
    } catch (error) {
      console.error("Error cloning fixture:", error);
      toast.error("Failed to clone fixture");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading fixture details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !fixture) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-red-500">{error || "Fixture not found"}</p>
          <Button asChild variant="outline">
            <Link href={`/projects/${projectId}/fixtures`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Fixtures
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">{editMode ? "Edit Fixture" : fixture.name}</h1>
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
            {fixture.type.charAt(0).toUpperCase() + fixture.type.slice(1)}
          </div>
        </div>

        <div className="flex space-x-2">
          <Button asChild variant="outline">
            <Link href={`/projects/${projectId}/fixtures`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          
          {!editMode && (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  // Kiểm tra quyền sửa fixture
                  if (!hasPermission("testcase.update")) {
                    toast.error("You don't have permission to edit fixtures");
                    return;
                  }
                  setEditMode(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleCloneFixture}
              >
                <Copy className="mr-2 h-4 w-4" />
                Clone
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={() => {
                  // Kiểm tra quyền xóa fixture
                  if (!hasPermission("testcase.delete")) {
                    toast.error("You don't have permission to delete fixtures");
                    return;
                  }
                  setIsConfirmDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="mt-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="steps">Steps</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-4">
          {editMode ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={editedFixture.name || ""}
                    onChange={handleInputChange}
                    placeholder="Fixture name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={editedFixture.type || "setup"}
                    onValueChange={(value) => handleSelectChange("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fixture type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="setup">Setup</SelectItem>
                      <SelectItem value="teardown">Teardown</SelectItem>
                      <SelectItem value="data">Test Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={editedFixture.description || ""}
                    onChange={handleInputChange}
                    placeholder="Describe what this fixture does"
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveFixture}
                    disabled={isSaving || !editedFixture.name?.trim()}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                    <p className="text-base">
                      {fixture.description || "No description provided"}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">File Path</h3>
                    <p className="text-base font-mono text-sm">
                      {fixture.path}/{fixture.filename}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                    <p className="text-base">
                      {new Date(fixture.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
                    <p className="text-base">
                      {new Date(fixture.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Created By</h3>
                    <p className="text-base">
                      {fixture.created_by_username || "System"}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated By</h3>
                    <p className="text-base">
                      {fixture.updated_by_username || "System"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="steps" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fixture Steps</CardTitle>
              <CardDescription>
                Steps that will be executed when this fixture is used in a test case.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fixture.steps && fixture.steps.length > 0 ? (
                <div className="border rounded-md divide-y">
                  {fixture.steps.map((step) => (
                    <div key={step.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Step {step.order}: {step.action}</h4>
                          {step.data && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Data: {step.data}
                            </p>
                          )}
                          {step.expected && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Expected: {step.expected}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {step.disabled && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                              Disabled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No steps defined for this fixture</p>
                  <Button className="mt-4" asChild>
                    <Link href={`/projects/${projectId}/fixtures/${fixtureId}/steps`}>
                      Add Steps
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href={`/projects/${projectId}/fixtures/${fixtureId}/steps`}>
                  Manage Steps
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm delete dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Fixture</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this fixture? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsConfirmDialogOpen(false)} 
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteFixture} 
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Fixture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 