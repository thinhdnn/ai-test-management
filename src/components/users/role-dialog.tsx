"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { User } from "@prisma/client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";

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

interface RoleDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleChange?: () => void;
}

export function RoleDialog({ user, open, onOpenChange, onRoleChange }: RoleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<string | null>(null);

  // Fetch available roles and current user role
  useEffect(() => {
    const fetchRolesAndUserRole = async () => {
      if (!open) return; // Only fetch when dialog is open
      
      try {
        setIsLoadingRoles(true);
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
  }, [user.id, open]);

  const roleFormSchema = createRoleFormSchema();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      roleId: currentUserRoleId || "",
    },
    values: { 
      roleId: currentUserRoleId || "" 
    },
  });

  useEffect(() => {
    if (currentUserRoleId) {
      form.setValue('roleId', currentUserRoleId);
    }
  }, [currentUserRoleId, form]);

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
      onOpenChange(false);
      if (onRoleChange) onRoleChange();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription>
            Update the role for user <span className="font-medium">{user.username}</span>
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ""}
                    disabled={isLoadingRoles}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingRoles ? "Loading roles..." : "Select a role"} />
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
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || isLoadingRoles || roles.length === 0}
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 