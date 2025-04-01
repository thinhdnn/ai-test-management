"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RolesTab from "./tabs/RolesTab";
import UsersTab from "./tabs/UsersTab";
import ResourcePermissionsTab from "./tabs/ResourcePermissionsTab";

// Define types based on Prisma models
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

type UserRole = {
  id: string;
  userId: string;
  roleId: string;
  role: Role;
};

type User = {
  id: string;
  username: string;
  role: string;
  roles: UserRole[];
};

type RBACPanelProps = {
  initialRoles: Role[];
  initialPermissions: Permission[];
  initialUsers: User[];
};

export default function RBACPanel({
  initialRoles,
  initialPermissions,
  initialUsers,
}: RBACPanelProps) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [permissions, setPermissions] =
    useState<Permission[]>(initialPermissions);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [activeTab, setActiveTab] = useState("roles");

  return (
    <div className="space-y-6">
      <Tabs defaultValue="roles" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="resources">Resource Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4 mt-6">
          <RolesTab
            roles={roles}
            permissions={permissions}
            setRoles={setRoles}
          />
        </TabsContent>

        <TabsContent value="users" className="space-y-4 mt-6">
          <UsersTab users={users} roles={roles} setUsers={setUsers} />
        </TabsContent>

        <TabsContent value="resources" className="space-y-4 mt-6">
          <ResourcePermissionsTab
            users={users}
            permissions={permissions.filter(
              (p) =>
                p.name.startsWith("project.") || p.name.startsWith("testcase.")
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
