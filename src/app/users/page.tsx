'use client';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { columns } from "@/components/users/columns";
import { DataTable } from "@/components/ui/data-table";
import { User } from "@prisma/client";
import { useState, useEffect, useCallback } from "react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
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
        <Button asChild>
          <Link href="/users/new">Add User</Link>
        </Button>
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
          data={users as User[]}
          searchKey="username"
          searchPlaceholder="Search users..."
        />
      )}
    </div>
  );
}
