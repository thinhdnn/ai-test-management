"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Check, X, Mail, Shield, User as UserIcon } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User as PrismaUser } from "@prisma/client";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RoleDialog } from "./role-dialog";

// Extend User type to include virtual fields from API
// Sử dụng type thay vì interface để tránh lỗi extends
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
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="flex items-center">
        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
        <span>{row.getValue("email") || "No email"}</span>
      </div>
    ),
  },
  {
    id: "role",
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
    cell: ({ row }) => {
      const user = row.original;
      
      // Kiểm tra isAdmin từ API mới
      let isAdmin = user.isAdmin;
      let roleName = "";
      
      // Nếu không có isAdmin, kiểm tra từ roles
      if (isAdmin === undefined && user.roles && user.roles.length > 0) {
        // Kiểm tra xem có vai trò Administrator không
        isAdmin = user.roles.some(r => 
          r.role.name.toLowerCase() === "administrator"
        );
        
        // Lấy tên vai trò đầu tiên nếu không phải admin
        if (!isAdmin && user.roles.length > 0) {
          roleName = user.roles[0].role.name;
        }
      } 
      // Legacy: Nếu không có roles, kiểm tra field role
      else if (isAdmin === undefined && user.role) {
        isAdmin = user.role === "admin";
      }
      
      // Nếu là admin, hiển thị "Administrator"
      if (isAdmin) {
        roleName = "Administrator";
      } 
      // Nếu chưa có roleName, lấy từ legacy hoặc fallback
      else if (!roleName) {
        roleName = user.role || "User";
      }
      
      return (
        <div
          className={
            isAdmin ? "text-blue-600 font-medium flex items-center" : "flex items-center"
          }
        >
          {isAdmin ? (
            <Shield className="h-4 w-4 mr-2 text-blue-600" />
          ) : (
            <UserIcon className="h-4 w-4 mr-2 text-gray-500" />
          )}
          {roleName}
        </div>
      );
    },
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
      const [showRoleDialog, setShowRoleDialog] = useState(false);

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
        <>
          <RoleDialog 
            user={user} 
            open={showRoleDialog} 
            onOpenChange={setShowRoleDialog}
            onRoleChange={() => {
              // Sử dụng hàm làm mới từ cửa sổ toàn cục
              // @ts-ignore
              if (typeof window.refreshUserTable === 'function') {
                // @ts-ignore
                window.refreshUserTable();
              } else {
                window.location.reload();
              }
            }}
          />
          
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
              <DropdownMenuItem onClick={() => setShowRoleDialog(true)}>
                Change Role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleUserStatus} disabled={loading}>
                {user.isActive ? "Disable User" : "Enable User"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      );
    },
  },
];
