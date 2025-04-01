"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types
type Permission = {
  id: string;
  name: string;
  description: string | null;
};

type User = {
  id: string;
  username: string;
  role: string;
};

type Project = {
  id: string;
  name: string;
};

type TestCase = {
  id: string;
  name: string;
  projectId: string;
};

type PermissionAssignment = {
  id: string;
  userId: string;
  permissionId: string;
  resourceType: string;
  resourceId: string;
};

type ResourcePermissionsTabProps = {
  users: User[];
  permissions: Permission[];
};

export default function ResourcePermissionsTab({
  users,
  permissions,
}: ResourcePermissionsTabProps) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResourceType, setSelectedResourceType] =
    useState<string>("project");
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissionAssignments, setPermissionAssignments] = useState<
    PermissionAssignment[]
  >([]);

  // Filter users by search term
  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch projects and testcases data
  useEffect(() => {
    fetchResources();
    fetchPermissionAssignments();
  }, []);

  // Fetch resource data
  const fetchResources = async () => {
    try {
      // Get projects list
      const projectsResponse = await fetch("/api/projects");
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(projectsData);

        // If there are projects, select the first one by default
        if (projectsData.length > 0) {
          setSelectedResourceId(projectsData[0].id);
          fetchTestCases(projectsData[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast.error("Could not load resource data");
    }
  };

  // Fetch test cases for a project
  const fetchTestCases = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/test-cases`);
      if (response.ok) {
        const data = await response.json();
        setTestCases(data);
      }
    } catch (error) {
      console.error("Error fetching test cases:", error);
    }
  };

  // Fetch permission assignments
  const fetchPermissionAssignments = async () => {
    try {
      const response = await fetch(
        "/api/settings/rbac/permissions/assignments"
      );
      if (response.ok) {
        const data = await response.json();
        setPermissionAssignments(data);
      }
    } catch (error) {
      console.error("Error fetching permission assignments:", error);
    }
  };

  // Handle resource type change
  const handleResourceTypeChange = (value: string) => {
    setSelectedResourceType(value);
    // If project is selected, set default value for project
    if (value === "project" && projects.length > 0) {
      setSelectedResourceId(projects[0].id);
    }
    // If testcase is selected, set default value for testcase
    else if (value === "testcase" && testCases.length > 0) {
      setSelectedResourceId(testCases[0].id);
    } else {
      setSelectedResourceId("");
    }
  };

  // Open dialog to assign permissions
  const openPermissionDialog = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedPermissions(
      permissionAssignments
        .filter(
          (pa) =>
            pa.userId === userId &&
            pa.resourceType === selectedResourceType &&
            pa.resourceId === selectedResourceId
        )
        .map((pa) => pa.permissionId)
    );
    setIsDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setSelectedUserId("");
    setSelectedPermissions([]);
    setIsDialogOpen(false);
  };

  // Save permissions
  const handleSavePermissions = async () => {
    if (!selectedUserId || !selectedResourceType || !selectedResourceId) {
      toast.error("Invalid data");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        "/api/settings/rbac/permissions/assignments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: selectedUserId,
            resourceType: selectedResourceType,
            resourceId: selectedResourceId,
            permissionIds: selectedPermissions,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Cannot save permissions");
      }

      toast.success("Permissions saved successfully");
      fetchPermissionAssignments();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Get selected resource name
  const getSelectedResourceName = () => {
    if (selectedResourceType === "project") {
      const project = projects.find((p) => p.id === selectedResourceId);
      return project ? project.name : "Unknown Project";
    } else if (selectedResourceType === "testcase") {
      const testCase = testCases.find((tc) => tc.id === selectedResourceId);
      return testCase ? testCase.name : "Unknown Test Case";
    }
    return "";
  };

  // Get permissions for resource type
  const getResourcePermissions = () => {
    return permissions.filter((p) =>
      p.name.startsWith(`${selectedResourceType.toLowerCase()}.`)
    );
  };

  // Check if user has permission on resource
  const hasPermission = (userId: string, permissionName: string) => {
    const permission = permissions.find((p) => p.name === permissionName);
    if (!permission) return false;

    return permissionAssignments.some(
      (pa) =>
        pa.userId === userId &&
        pa.permissionId === permission.id &&
        pa.resourceType === selectedResourceType &&
        pa.resourceId === selectedResourceId
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Resource Permission Management</h2>

        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex space-x-4 items-center">
        <div className="w-40">
          <Select
            value={selectedResourceType}
            onValueChange={handleResourceTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select resource type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="testcase">Test Case</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Select
            value={selectedResourceId}
            onValueChange={(value) => {
              setSelectedResourceId(value);
              if (selectedResourceType === "project") {
                fetchTestCases(value);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select resource" />
            </SelectTrigger>
            <SelectContent>
              {selectedResourceType === "project" &&
                projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              {selectedResourceType === "testcase" &&
                testCases.map((testCase) => (
                  <SelectItem key={testCase.id} value={testCase.id}>
                    {testCase.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedResourceId && (
        <Card>
          <CardHeader>
            <CardTitle>Permissions for: {getSelectedResourceName()}</CardTitle>
            <CardDescription>
              Manage user access permissions for this resource
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-md border">
                <div className="grid grid-cols-3 bg-muted/50 p-3 font-medium">
                  <div>User</div>
                  <div>Permissions</div>
                  <div className="text-right">Actions</div>
                </div>
                <ScrollArea className="h-[400px]">
                  {filteredUsers.map((user) => {
                    // Get user permissions for this resource
                    const userPermissions = permissions.filter(
                      (p) =>
                        p.name.startsWith(
                          `${selectedResourceType.toLowerCase()}.`
                        ) && hasPermission(user.id, p.name)
                    );

                    return (
                      <div
                        key={user.id}
                        className="grid grid-cols-3 items-center p-3 border-t"
                      >
                        <div className="font-medium">{user.username}</div>
                        <div>
                          <div className="flex flex-wrap gap-1">
                            {userPermissions.length > 0 ? (
                              userPermissions.map((permission) => (
                                <Badge key={permission.id} variant="outline">
                                  {permission.name.split(".")[1]}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                No permissions
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPermissionDialog(user.id)}
                          >
                            Assign Permissions
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                      {searchTerm
                        ? "No matching users found."
                        : "No users available."}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permission assignment dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Resource Permissions</DialogTitle>
            <DialogDescription>
              Assign user access permissions for: {getSelectedResourceName()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              {getResourcePermissions().map((permission) => (
                <div key={permission.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={`perm-${permission.id}`}
                    checked={selectedPermissions.includes(permission.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPermissions((prev) => [
                          ...prev,
                          permission.id,
                        ]);
                      } else {
                        setSelectedPermissions((prev) =>
                          prev.filter((id) => id !== permission.id)
                        );
                      }
                    }}
                  />
                  <div>
                    <label
                      htmlFor={`perm-${permission.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {permission.name}
                    </label>
                    {permission.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {permission.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={loading}>
              {loading ? "Saving..." : "Save Permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
