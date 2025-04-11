'use client';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { columns } from "@/components/users/columns";
import { DataTable } from "@/components/ui/data-table";
import { User } from "@prisma/client";
import { useState, useEffect } from "react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchUsers() {
      const data = await fetch('/api/users').then(res => res.json());
      setUsers(data);
      setLoading(false);
    }
    fetchUsers();
  }, []);

  return (
    <div className="container px-4 py-6 sm:px-6 md:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <Button asChild>
          <Link href="/users/new">Add User</Link>
        </Button>
      </div>

      {users.length === 0 ? (
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
