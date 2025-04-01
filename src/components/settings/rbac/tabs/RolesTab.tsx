"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";

// Types
type Permission = {
  id: string;
  name: string;
  description: string | null;
};

type RolePermission = {
  id: string;
  permissionId: string;
  roleId: string;
  permission: Permission;
};

type Role = {
  id: string;
  name: string;
  description: string | null;
  permissions: RolePermission[];
};

type RolesTabProps = {
  roles: Role[];
  permissions: Permission[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
};

export default function RolesTab({
  roles,
  permissions,
  setRoles,
}: RolesTabProps) {
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "matrix">("table");

  // Group permissions by type
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const [group] = permission.name.split(".");
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Reset form
  const resetForm = () => {
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions([]);
    setIsCreatingRole(false);
    setIsEditingRole(null);
  };

  // Open edit dialog
  const openEditDialog = (role: Role) => {
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setSelectedPermissions(role.permissions.map((rp) => rp.permissionId));
    setIsEditingRole(role.id);
  };

  // Handle creating a new role
  const handleCreateRole = async () => {
    if (!roleName) {
      toast.error("Role name cannot be empty");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/settings/rbac/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roleName,
          description: roleDescription,
          permissions: selectedPermissions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Cannot create role");
      }

      const newRole = await response.json();
      setRoles((prev) => [...prev, newRole]);
      toast.success("Role created successfully");
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Handle updating a role
  const handleUpdateRole = async () => {
    if (!isEditingRole || !roleName) {
      toast.error("Invalid data");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/settings/rbac/roles/${isEditingRole}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: roleName,
            description: roleDescription,
            permissions: selectedPermissions,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Cannot update role");
      }

      const updatedRole = await response.json();
      setRoles((prev) =>
        prev.map((role) => (role.id === updatedRole.id ? updatedRole : role))
      );
      toast.success("Role updated successfully");
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a role
  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/settings/rbac/roles/${roleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Cannot delete role");
      }

      setRoles((prev) => prev.filter((role) => role.id !== roleId));
      toast.success("Role deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Toggle permission for a role in matrix view
  const togglePermission = async (roleId: string, permissionId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    const hasPermission = role.permissions.some(
      (rp) => rp.permissionId === permissionId
    );

    try {
      setLoading(true);
      const response = await fetch(
        `/api/settings/rbac/permissions/assignments`,
        {
          method: hasPermission ? "DELETE" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roleId,
            permissionId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            `Cannot ${hasPermission ? "remove" : "assign"} permission`
        );
      }

      // Update local state
      if (hasPermission) {
        // Remove permission
        setRoles((prev) =>
          prev.map((r) => {
            if (r.id === roleId) {
              return {
                ...r,
                permissions: r.permissions.filter(
                  (rp) => rp.permissionId !== permissionId
                ),
              };
            }
            return r;
          })
        );
      } else {
        // Add permission - simplification as we don't have the new RolePermission ID
        const mockRolePermission = {
          id: `temp-${roleId}-${permissionId}`,
          roleId,
          permissionId,
          permission: permissions.find((p) => p.id === permissionId)!,
        };

        setRoles((prev) =>
          prev.map((r) => {
            if (r.id === roleId) {
              return {
                ...r,
                permissions: [...r.permissions, mockRolePermission],
              };
            }
            return r;
          })
        );
      }

      toast.success(
        hasPermission
          ? "Permission removed successfully"
          : "Permission assigned successfully"
      );
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Check if a role has a permission
  const hasPermission = (roleId: string, permissionId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return false;

    return role.permissions.some((rp) => rp.permissionId === permissionId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Role Management</h2>
        <div className="flex items-center gap-4">
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as "table" | "matrix")}
            className="w-[200px]"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table">List View</TabsTrigger>
              <TabsTrigger value="matrix">Matrix View</TabsTrigger>
            </TabsList>
          </Tabs>

          <Dialog open={isCreatingRole} onOpenChange={setIsCreatingRole}>
            <DialogTrigger asChild>
              <Button>Add New Role</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Role</DialogTitle>
                <DialogDescription>
                  Create a new role and assign permissions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name</Label>
                  <Input
                    id="name"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Enter role name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="Describe this role"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <ScrollArea className="h-[300px] rounded-md border p-4">
                    <div className="space-y-4">
                      {Object.entries(groupedPermissions).map(
                        ([group, perms]) => (
                          <div key={group} className="space-y-2">
                            <h4 className="font-medium capitalize">{group}</h4>
                            <div className="pl-4 space-y-1">
                              {perms.map((permission) => (
                                <div
                                  key={permission.id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={permission.id}
                                    checked={selectedPermissions.includes(
                                      permission.id
                                    )}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedPermissions((prev) => [
                                          ...prev,
                                          permission.id,
                                        ]);
                                      } else {
                                        setSelectedPermissions((prev) =>
                                          prev.filter(
                                            (id) => id !== permission.id
                                          )
                                        );
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={permission.id}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {permission.name}
                                    {permission.description && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({permission.description})
                                      </span>
                                    )}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRole} disabled={loading}>
                  {loading ? "Creating..." : "Create Role"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit role dialog */}
        <Dialog
          open={!!isEditingRole}
          onOpenChange={(open) => !open && resetForm()}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Update role information and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Role Name</Label>
                <Input
                  id="edit-name"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <div className="space-y-4">
                    {Object.entries(groupedPermissions).map(
                      ([group, perms]) => (
                        <div key={group} className="space-y-2">
                          <h4 className="font-medium capitalize">{group}</h4>
                          <div className="pl-4 space-y-1">
                            {perms.map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`edit-${permission.id}`}
                                  checked={selectedPermissions.includes(
                                    permission.id
                                  )}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedPermissions((prev) => [
                                        ...prev,
                                        permission.id,
                                      ]);
                                    } else {
                                      setSelectedPermissions((prev) =>
                                        prev.filter(
                                          (id) => id !== permission.id
                                        )
                                      );
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`edit-${permission.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {permission.name}
                                  {permission.description && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({permission.description})
                                    </span>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {viewMode === "table" ? (
        <Card>
          <CardHeader>
            <CardTitle>Role List</CardTitle>
            <CardDescription>
              Manage roles and access permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions Count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.description}</TableCell>
                    <TableCell>{role.permissions.length}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(role)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRole(role.id)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      No roles yet. Add a new role.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Permission Matrix</CardTitle>
            <CardDescription>
              Manage role permissions in a matrix view
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">
                        Permission
                      </TableHead>
                      {roles.map((role) => (
                        <TableHead key={role.id} className="text-center">
                          {role.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(groupedPermissions).map(
                      ([group, perms]) => (
                        <React.Fragment key={`group-section-${group}`}>
                          <TableRow
                            key={`group-${group}`}
                            className="bg-muted/50"
                          >
                            <TableCell
                              colSpan={roles.length + 1}
                              className="font-bold capitalize"
                            >
                              {group}
                            </TableCell>
                          </TableRow>
                          {perms.map((permission) => (
                            <TableRow key={permission.id}>
                              <TableCell className="font-medium">
                                {permission.name}
                                {permission.description && (
                                  <div className="text-xs text-muted-foreground">
                                    {permission.description}
                                  </div>
                                )}
                              </TableCell>
                              {roles.map((role) => (
                                <TableCell
                                  key={`${role.id}-${permission.id}`}
                                  className="text-center"
                                >
                                  <Checkbox
                                    id={`matrix-${role.id}-${permission.id}`}
                                    checked={hasPermission(
                                      role.id,
                                      permission.id
                                    )}
                                    onCheckedChange={() =>
                                      togglePermission(role.id, permission.id)
                                    }
                                    disabled={loading}
                                  />
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </React.Fragment>
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
