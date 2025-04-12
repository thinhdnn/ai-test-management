'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { RoleForm } from '@/components/users/role-form';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { User } from '@prisma/client';

export default function EditUserPage() {
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }
        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        toast.error("Failed to load user information");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  if (loading) {
    return (
      <div className="container px-4 py-6 sm:px-6 md:px-8">
        <div className="flex justify-center py-10">
          <p>Loading user information...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container px-4 py-6 sm:px-6 md:px-8">
        <div className="flex justify-center py-10">
          <p>User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 sm:px-6 md:px-8">
      <Link 
        href="/users" 
        className="flex items-center text-sm text-muted-foreground mb-4 hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Users
      </Link>
      
      <div className="flex flex-col md:w-2/3 lg:w-1/2 mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Edit User Role</h1>
        <p className="text-muted-foreground mb-6">
          User: <span className="font-medium">{user.username}</span>
          {user.email && ` (${user.email})`}
        </p>
        
        <div className="bg-card border rounded-lg p-6">
          <RoleForm user={user} />
        </div>
      </div>
    </div>
  );
} 