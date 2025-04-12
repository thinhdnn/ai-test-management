"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { User as PrismaUser } from "@prisma/client";

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

// Extend User type to include virtual fields from API
type User = Omit<PrismaUser, 'role'> & {
  // Legacy field, có thể có hoặc không
  role?: string;
  // Thông tin roles từ RBAC
  roles?: { 
    id: string;
    userId: string;
    roleId: string;
    role: {
      id: string;
      name: string;
      description?: string;
    }
  }[];
  // Trường mới theo chuẩn RBAC
  isAdmin?: boolean;
}

// Dynamic schema that will be updated with available roles
const createRoleFormSchema = () => {
  return z.object({
    roleId: z.string({
      required_error: "Please select a role",
    }).refine(val => val !== "" && val !== "placeholder", {
      message: "Please select a valid role"
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
      roleId: currentUserRoleId || "placeholder",
    },
    values: { 
      roleId: currentUserRoleId || "placeholder" 
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
      
      // Validate that we have a real role ID
      if (!data.roleId || data.roleId === "placeholder" || data.roleId === "no-role") {
        toast.error("Please select a valid role");
        return;
      }
      
      // Find the selected role
      const selectedRole = roles.find(r => r.id === data.roleId);
      if (!selectedRole) {
        toast.error("Selected role not found");
        return;
      }
      
      // Gán RBAC role cho người dùng
      const rbacResponse = await fetch(`/api/settings/rbac/users/${user.id}/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleId: data.roleId }),
      });
      
      if (!rbacResponse.ok) {
        throw new Error("Failed to assign role");
      }
      
      toast.success(`Role updated successfully to ${selectedRole.name}`);
      onOpenChange(false);
      if (onRoleChange) onRoleChange();
      else {
        // Gọi hàm làm mới từ đối tượng window
        // @ts-ignore
        if (typeof window.refreshUserTable === 'function') {
          // @ts-ignore
          window.refreshUserTable();
        } else {
          // Nếu không có hàm làm mới, tải lại trang
          window.location.reload();
        }
      }
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
                    value={field.value || "placeholder"}
                    disabled={isLoadingRoles}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingRoles ? "Loading roles..." : "Select a role"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.length === 0 ? (
                        <SelectItem value="no-role" disabled>No roles available</SelectItem>
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
                disabled={loading || isLoadingRoles || roles.length === 0 || 
                  !form.getValues("roleId") || 
                  form.getValues("roleId") === "placeholder" ||
                  form.getValues("roleId") === "no-role"}
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