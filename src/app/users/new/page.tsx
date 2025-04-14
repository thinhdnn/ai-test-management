'use client';

import { UserForm } from "@/components/users/user-form";
import { usePermission } from "@/lib/hooks/usePermission";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function NewUserPage() {
  const router = useRouter();
  const { hasPermission } = usePermission();

  // Check permissions
  useEffect(() => {
    if (!hasPermission("users.create")) {
      toast.error("You don't have permission to create users");
      router.push("/users");
      return;
    }
  }, [hasPermission, router]);

  return (
    <div className="container px-4 py-6 sm:px-6 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Add New User</h1>
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <UserForm />
        </div>
      </div>
    </div>
  );
}
