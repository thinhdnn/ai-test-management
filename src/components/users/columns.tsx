"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Check, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User } from "@prisma/client";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "username",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Username
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{row.getValue("username")}</div>,
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <div className="font-mono text-xs">{row.getValue("id")}</div>
    ),
  },
  {
    accessorKey: "role",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Role
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div
        className={
          row.getValue("role") === "admin" ? "text-blue-600 font-medium" : ""
        }
      >
        {row.getValue("role")}
      </div>
    ),
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const isActive = row.getValue("isActive");
      return (
        <div>
          {isActive ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Check className="h-3 w-3 mr-1" /> Active
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <X className="h-3 w-3 mr-1" /> Disabled
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date;
      return <div>{formatDate(date)}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
      const [loading, setLoading] = useState(false);

      const toggleUserStatus = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/users/${user.id}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ isActive: !user.isActive }),
          });

          if (!response.ok) {
            throw new Error("Failed to update user status");
          }

          const updatedUser = await response.json();
          // Update the row data
          row.original.isActive = updatedUser.isActive;
          
          toast.success(updatedUser.isActive 
            ? `User ${user.username} has been enabled` 
            : `User ${user.username} has been disabled`);
          
          // Force table refresh
          window.location.reload();
        } catch (error) {
          toast.error("Failed to update user status");
          console.error(error);
        } finally {
          setLoading(false);
        }
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.id)}
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href={`/users/${user.id}/edit`} className="w-full">
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href={`/users/${user.id}/change-password`} className="w-full">
                Change Password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleUserStatus} disabled={loading}>
              {user.isActive ? "Disable User" : "Enable User"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
