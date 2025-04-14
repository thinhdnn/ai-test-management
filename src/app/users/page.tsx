'use client';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { columns } from "@/components/users/columns";
import { DataTable } from "@/components/ui/data-table";
import { User as PrismaUser } from "@prisma/client";
import { useState, useEffect, useCallback } from "react";
import { usePermission } from "@/lib/hooks/usePermission";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { hasPermission } = usePermission();
  const router = useRouter();
  
  // Check permissions
  useEffect(() => {
    if (!hasPermission("users.view")) {
      toast.error("You don't have permission to view users");
      router.push("/");
      return;
    }
  }, [hasPermission, router]);
  
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetch('/api/users').then(res => res.json());
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Function to refresh user data
  const refreshUsers = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  // Expose the refresh function to the window object for components to access
  useEffect(() => {
    // @ts-ignore
    window.refreshUserTable = refreshUsers;
    
    return () => {
      // @ts-ignore
      delete window.refreshUserTable;
    };
  }, [refreshUsers]);

  return (
    <div className="container px-4 py-6 sm:px-6 md:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        {hasPermission("users.create") && (
          <Button asChild>
            <Link href="/users/new">Add User</Link>
          </Button>
        )}
      </div> 

      {users.length === 0 && !loading ? (
        <div className="text-center p-10 border rounded-md">
          <p className="text-muted-foreground">
            No users found. Create your first user to get started.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          searchKey="username"
          searchPlaceholder="Search users..."
        />
      )}
    </div>
  );
}
