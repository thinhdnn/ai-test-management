"use client";

import { useState, useEffect } from "react";
import { SaveButton } from "@/components/save-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Edit, Trash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermission } from "@/lib/hooks/usePermission";
import { useRouter } from "next/navigation";

// Define types for the data
interface Permission {
  id: string;
  name: string;
  description: string;
}

interface RolePermission {
  roleId: string;
  permissionId: string;
  permission: Permission;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: RolePermission[];
}

interface UserRole {
  userId: string;
  roleId: string;
  role: Role;
}

interface User {
  id: string;
  username: string;
  email: string;
  roles: UserRole[];
}

export default function RBACPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isDeletingRole, setIsDeletingRole] = useState(false);
  const [isAddingPermission, setIsAddingPermission] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [isDeleteRoleDialogOpen, setIsDeleteRoleDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [roleToEdit, setRoleToEdit] = useState({
    id: '',
    name: '',
    description: '',
  });
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [newPermission, setNewPermission] = useState({
    name: '',
    description: '',
  });

  // Role-permission mapping for the matrix
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});

  // User dialog state
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserRoles, setSelectedUserRoles] = useState<string[]>([]);
  const [isUpdatingUserRoles, setIsUpdatingUserRoles] = useState(false);

  const router = useRouter();
  const { hasPermission } = usePermission();

  // Kiểm tra quyền người dùng ngay khi component được tải
  useEffect(() => {
    if (!hasPermission("rbac.manage")) {
      toast.error("You don't have permission to manage RBAC settings");
      router.push("/settings");
      return;
    }
  }, [hasPermission, router]);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        const [rolesResponse, permissionsResponse, usersResponse] = await Promise.all([
          fetch('/api/settings/rbac/roles', { cache: 'no-store' }),
          fetch('/api/settings/rbac/permissions', { cache: 'no-store' }),
          fetch('/api/settings/rbac/users', { cache: 'no-store' })
        ]);

        if (!rolesResponse.ok || !permissionsResponse.ok || !usersResponse.ok) {
          throw new Error('Failed to fetch RBAC data');
        }

        const [rolesData, permissionsData, usersData] = await Promise.all([
          rolesResponse.json(),
          permissionsResponse.json(),
          usersResponse.json()
        ]);

        setRoles(rolesData);
        setPermissions(permissionsData);
        setUsers(usersData);

        // Initialize rolePermissions from the roles data
        const mappings: Record<string, string[]> = {};
        rolesData.forEach((role: Role) => {
          mappings[role.id] = role.permissions.map((p) => p.permissionId);
        });
        setRolePermissions(mappings);
      } catch (error) {
        console.error('Error fetching RBAC data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load RBAC data');
        toast.error('Failed to load RBAC data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const response = await fetch('/api/settings/rbac/roles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roles, permissions, rolePermissions }),
      });

      if (!response.ok) {
        throw new Error('Failed to save RBAC settings');
      }

      toast.success('RBAC settings saved successfully');
      window.location.reload();
    } catch (error) {
      console.error('Error saving RBAC settings:', error);
      toast.error('Could not save RBAC settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle permission for a role
  const togglePermission = (roleId: string, permissionId: string) => {
    setRolePermissions((prev) => {
      const roleMappings = [...(prev[roleId] || [])];
      if (roleMappings.includes(permissionId)) {
        return {
          ...prev,
          [roleId]: roleMappings.filter((id) => id !== permissionId),
        };
      } else {
        return {
          ...prev,
          [roleId]: [...roleMappings, permissionId],
        };
      }
    });
  };

  // Handle opening the edit role dialog
  const handleEditRoleClick = (role: Role) => {
    setRoleToEdit({
      id: role.id,
      name: role.name,
      description: role.description || '',
    });
    setIsEditRoleDialogOpen(true);
  };

  // Handle opening the delete role dialog
  const handleDeleteRoleClick = (role: Role) => {
    setRoleToDelete(role);
    setIsDeleteRoleDialogOpen(true);
  };

  // Handle editing a role
  const handleEditRole = async () => {
    if (!hasPermission("rbac.manage")) {
      toast.error("You don't have permission to update roles");
      return;
    }
    
    if (!roleToEdit.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      setIsEditingRole(true);

      const response = await fetch(`/api/settings/rbac/roles/${roleToEdit.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: roleToEdit.name,
          description: roleToEdit.description,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update role');
      }

      const updatedRole = await response.json();

      setRoles((prev) =>
        prev.map((role) =>
          role.id === updatedRole.id
            ? {
                ...role,
                name: updatedRole.name,
                description: updatedRole.description,
              }
            : role
        )
      );

      setIsEditRoleDialogOpen(false);
      toast.success('Role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    } finally {
      setIsEditingRole(false);
    }
  };

  // Handle deleting a role
  const handleDeleteRole = async () => {
    if (!hasPermission("rbac.manage")) {
      toast.error("You don't have permission to delete roles");
      return;
    }
    
    if (!roleToDelete) return;

    try {
      setIsDeletingRole(true);

      const response = await fetch(`/api/settings/rbac/roles/${roleToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete role');
      }

      setRoles((prev) => prev.filter((role) => role.id !== roleToDelete.id));

      setRolePermissions((prev) => {
        const newPermissions = { ...prev };
        delete newPermissions[roleToDelete.id];
        return newPermissions;
      });

      setIsDeleteRoleDialogOpen(false);
      toast.success('Role deleted successfully');
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete role');
    } finally {
      setIsDeletingRole(false);
    }
  };

  // Handle adding a new role
  const handleAddRole = async () => {
    if (!hasPermission("rbac.manage")) {
      toast.error("You don't have permission to create roles");
      return;
    }
    
    if (!newRole.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      setIsAddingRole(true);

      const response = await fetch('/api/settings/rbac/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRole),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add role');
      }

      const createdRole = await response.json();

      setRoles((prev) => [...prev, { ...createdRole, permissions: [] }]);
      setRolePermissions((prev) => ({ ...prev, [createdRole.id]: [] }));

      setNewRole({ name: '', description: '' });
      setIsRoleDialogOpen(false);

      toast.success('Role added successfully');
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add role');
    } finally {
      setIsAddingRole(false);
    }
  };

  // Handle adding a new permission
  const handleAddPermission = async () => {
    if (!hasPermission("rbac.manage")) {
      toast.error("You don't have permission to create permissions");
      return;
    }
    
    if (!newPermission.name.trim()) {
      toast.error('Permission name is required');
      return;
    }

    try {
      setIsAddingPermission(true);

      const response = await fetch('/api/settings/rbac/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPermission),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add permission');
      }

      const createdPermission = await response.json();

      setPermissions((prev) => [...prev, createdPermission]);

      setNewPermission({ name: '', description: '' });
      setIsPermissionDialogOpen(false);

      toast.success('Permission added successfully');
    } catch (error) {
      console.error('Error adding permission:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add permission');
    } finally {
      setIsAddingPermission(false);
    }
  };

  // Handle opening the edit user dialog
  const handleEditUserClick = (user: User) => {
    setEditingUser(user);
    setSelectedUserRoles(user.roles.map(r => r.roleId));
    setIsEditUserDialogOpen(true);
  };

  // Handle user roles update
  const handleUpdateUserRoles = async () => {
    if (!hasPermission("rbac.manage")) {
      toast.error("You don't have permission to update user roles");
      return;
    }
    
    if (!editingUser) return;
    
    try {
      setIsUpdatingUserRoles(true);
      
      const response = await fetch(`/api/settings/rbac/users/${editingUser.id}/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roleIds: selectedUserRoles }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user roles');
      }
      
      const updatedUser = await response.json();
      
      // Update the users array with the updated user
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === updatedUser.id ? updatedUser : user
        )
      );
      
      setIsEditUserDialogOpen(false);
      toast.success('User roles updated successfully');
    } catch (error) {
      console.error('Error updating user roles:', error);
      toast.error('Could not update user roles. Please try again.');
    } finally {
      setIsUpdatingUserRoles(false);
    }
  };

  // Handle roles toggle for a user
  const toggleUserRole = (roleId: string) => {
    setSelectedUserRoles(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(id => id !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container px-4 py-6 sm:px-6 md:px-8">
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>
              Create and manage roles for your application
            </CardDescription>
          </div>
          <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Role</DialogTitle>
                <DialogDescription>
                  Create a new role with a name and description
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Role Name</Label>
                  <Input
                    id="role-name"
                    placeholder="Enter role name"
                    value={newRole.name}
                    onChange={(e) =>
                      setNewRole((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-description">Description</Label>
                  <Textarea
                    id="role-description"
                    placeholder="Describe this role's purpose"
                    value={newRole.description}
                    onChange={(e) =>
                      setNewRole((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsRoleDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddRole} disabled={isAddingRole}>
                  {isAddingRole ? 'Adding...' : 'Add Role'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="list" onClick={() => setViewMode('list')}>
                List View
              </TabsTrigger>
              <TabsTrigger value="matrix" onClick={() => setViewMode('matrix')}>
                Matrix View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No roles configured yet. Add a role to get started.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">
                          {role.name}
                        </TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell>
                          {role.permissions.length > 0 ||
                          (rolePermissions[role.id] || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {role.permissions.map((p) => (
                                <span
                                  key={p.permissionId}
                                  className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs"
                                >
                                  {p.permission.name}
                                </span>
                              ))}
                              {(rolePermissions[role.id] || [])
                                .filter(
                                  (permId) =>
                                    !role.permissions.some(
                                      (p) => p.permissionId === permId
                                    )
                                )
                                .map((permId) => {
                                  const perm = permissions.find(
                                    (p) => p.id === permId
                                  );
                                  return perm ? (
                                    <span
                                      key={permId}
                                      className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs"
                                    >
                                      {perm.name}
                                    </span>
                                  ) : null;
                                })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No permissions
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRoleClick(role)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRoleClick(role)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="matrix" className="space-y-4">
              {roles.length === 0 || permissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add roles and permissions to view the matrix.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">
                          Permission / Role
                        </TableHead>
                        {roles.map((role) => (
                          <TableHead key={role.id}>{role.name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell className="font-medium">
                            {permission.name}
                          </TableCell>
                          {roles.map((role) => (
                            <TableCell key={role.id} className="text-center">
                              <Checkbox
                                checked={rolePermissions[role.id]?.includes(permission.id) || false}
                                onCheckedChange={() =>
                                  togglePermission(role.id, permission.id)
                                }
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="mr-2"
            onClick={() => setIsPermissionDialogOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Permission
          </Button>
          <SaveButton
            className="ml-auto"
            onClick={handleSave}
            isLoading={isSaving}
            saveText="Save Changes"
          />
        </CardFooter>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog
        open={isEditRoleDialogOpen}
        onOpenChange={setIsEditRoleDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the role name and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role-name">Role Name</Label>
              <Input
                id="edit-role-name"
                placeholder="Enter role name"
                value={roleToEdit.name}
                onChange={(e) =>
                  setRoleToEdit((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role-description">Description</Label>
              <Textarea
                id="edit-role-description"
                placeholder="Describe this role's purpose"
                value={roleToEdit.description}
                onChange={(e) =>
                  setRoleToEdit((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditRoleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditRole} disabled={isEditingRole}>
              {isEditingRole ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <AlertDialog
        open={isDeleteRoleDialogOpen}
        onOpenChange={setIsDeleteRoleDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the role "{roleToDelete?.name}". This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              disabled={isDeletingRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingRole ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permission Dialog */}
      <Dialog
        open={isPermissionDialogOpen}
        onOpenChange={setIsPermissionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Permission</DialogTitle>
            <DialogDescription>
              Create a new permission that can be assigned to roles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="permission-name">Permission Name</Label>
              <Input
                id="permission-name"
                placeholder="Enter permission name"
                value={newPermission.name}
                onChange={(e) =>
                  setNewPermission((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permission-description">Description</Label>
              <Textarea
                id="permission-description"
                placeholder="Describe what this permission allows"
                value={newPermission.description}
                onChange={(e) =>
                  setNewPermission((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPermissionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddPermission} disabled={isAddingPermission}>
              {isAddingPermission ? 'Adding...' : 'Add Permission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>User Role Assignment</CardTitle>
          <CardDescription>Assign roles to users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No users available to assign roles.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Assigned Roles</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((r) => (
                              <span
                                key={r.roleId}
                                className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs"
                              >
                                {r.role.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No roles assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditUserClick(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <SaveButton
            className="ml-auto"
            onClick={handleSave}
            isLoading={isSaving}
            saveText="Save Assignments"
          />
        </CardFooter>
      </Card>

      {/* Edit User Roles Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Roles</DialogTitle>
            <DialogDescription>
              Assign roles to {editingUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              {roles.map(role => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={selectedUserRoles.includes(role.id)}
                    onCheckedChange={() => toggleUserRole(role.id)}
                  />
                  <Label htmlFor={`role-${role.id}`} className="flex flex-col">
                    <span>{role.name}</span>
                    {role.description && (
                      <span className="text-sm text-muted-foreground">
                        {role.description}
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditUserDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUserRoles} 
              disabled={isUpdatingUserRoles}
            >
              {isUpdatingUserRoles ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
