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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define Role type
interface Role {
  id: string;
  name: string;
  description?: string;
}

// Dynamic schema that will be updated with available roles
const createUserFormSchema = (roles: Role[]) => {
  return z.object({
    username: z.string().min(3, {
      message: "Username must be at least 3 characters",
    }),
    email: z.string().email({
      message: "Please enter a valid email address",
    }).optional().or(z.literal('')),
    password: z.string().min(6, {
      message: "Password must be at least 6 characters",
    }),
    roleId: z.string(),
  });
};

type UserFormValues = z.infer<ReturnType<typeof createUserFormSchema>>;

export function UserForm({ user }: { user?: Partial<UserFormValues> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

  // Fetch available roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/settings/rbac/roles');
        
        if (!response.ok) {
          throw new Error('Failed to fetch roles');
        }
        
        const rolesData = await response.json();
        setRoles(rolesData);
      } catch (error) {
        console.error('Error fetching roles:', error);
        toast.error('Failed to load roles');
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  const userFormSchema = createUserFormSchema(roles);

  const defaultValues: Partial<UserFormValues> = {
    username: user?.username || "",
    email: user?.email || "",
    password: user?.password || "",
    roleId: user?.roleId || "none",
  };

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues,
  });

  async function onSubmit(data: UserFormValues) {
    try {
      setLoading(true);
      
      // Prepare data for API
      const userData = {
        username: data.username,
        email: data.email,
        password: data.password,
        createdBy: "system", // Could be updated to the current user
      };
      
      // Create user
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create user");
      }
      
      const createdUser = await response.json();
      
      // If a role was selected (not "none"), assign it using RBAC
      if (data.roleId && data.roleId !== "none") {
        try {
          const rbacResponse = await fetch(`/api/settings/rbac/users/${createdUser.id}/roles`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ roleId: data.roleId }),
          });
          
          if (!rbacResponse.ok) {
            toast.warning("User created but role assignment failed");
          }
        } catch (error) {
          console.error("Error assigning RBAC role:", error);
          toast.warning("User created but role assignment failed");
        }
      }

      toast.success("User created successfully");
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
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter email address (optional)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="roleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
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
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create User"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
