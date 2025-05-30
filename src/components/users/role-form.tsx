"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@prisma/client";

// Define Role type
interface Role {
  id: string;
  name: string;
  description?: string;
}

// Dynamic schema that will be updated with available roles
const createRoleFormSchema = () => {
  return z.object({
    roleId: z.string({
      required_error: "Please select a role",
    }),
  });
};

type RoleFormValues = z.infer<ReturnType<typeof createRoleFormSchema>>;

interface RoleFormProps {
  user: User;
}

export function RoleForm({ user }: RoleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<string | null>(null);

  // Fetch available roles and current user role
  useEffect(() => {
    const fetchRolesAndUserRole = async () => {
      try {
        // Fetch available roles
        const rolesResponse = await fetch('/api/settings/rbac/roles');
        if (!rolesResponse.ok) {
          throw new Error('Failed to fetch roles');
        }
        const rolesData = await rolesResponse.json();
        setRoles(rolesData);

        // Fetch current user roles
        const userRolesResponse = await fetch(`/api/settings/rbac/users/${user.id}/roles`);
        if (userRolesResponse.ok) {
          const userRolesData = await userRolesResponse.json();
          // If user has roles, set the first one as current
          if (userRolesData && userRolesData.length > 0) {
            setCurrentUserRoleId(userRolesData[0].roleId);
          }
        }
      } catch (error) {
        console.error('Error fetching roles or user roles:', error);
        toast.error('Failed to load roles information');
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRolesAndUserRole();
  }, [user.id]);

  const roleFormSchema = createRoleFormSchema();

  const defaultValues: Partial<RoleFormValues> = {
    roleId: currentUserRoleId || "",
  };

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues,
    values: { roleId: currentUserRoleId || "" }, // Update form values when currentUserRoleId changes
  });

  async function onSubmit(data: RoleFormValues) {
    try {
      setLoading(true);
      
      // Step 1: Determine basic role (admin/user) based on selected RBAC role
      const selectedRole = roles.find(r => r.id === data.roleId);
      const basicRole = (selectedRole?.name.toLowerCase() === "admin") ? "admin" : "user";
      
      // Step 2: Update the basic role in the user model
      const userRoleResponse = await fetch(`/api/users/${user.id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: basicRole }),
      });

      if (!userRoleResponse.ok) {
        const error = await userRoleResponse.json();
        throw new Error(error.message || "Failed to update user role");
      }
      
      // Step 3: Assign the RBAC role to the user
      const rbacResponse = await fetch(`/api/settings/rbac/users/${user.id}/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleId: data.roleId }),
      });
      
      if (!rbacResponse.ok) {
        toast.error("Role updated but permission assignment failed");
      }
      
      toast.success(`Role updated successfully to ${selectedRole?.name || "selected role"}`);
      router.push("/users");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (isLoadingRoles) {
    return <div className="flex justify-center py-4">Loading roles...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="roleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User Role</FormLabel>
              <FormDescription>
                The role determines what permissions the user has in the system.
              </FormDescription>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles.length === 0 ? (
                    <SelectItem value="" disabled>No roles available</SelectItem>
                  ) : (
                    roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} {role.description ? `- ${role.description}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || roles.length === 0}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 