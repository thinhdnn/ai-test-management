'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PasswordForm } from '@/components/users/password-form';
import { ChevronLeft } from 'lucide-react';

export default function ChangePasswordPage() {
  const params = useParams();
  const userId = params.id as string;

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
        <h1 className="text-3xl font-bold tracking-tight mb-6">Change Password</h1>
        
        <div className="bg-card border rounded-lg p-6">
          <PasswordForm userId={userId} />
        </div>
      </div>
    </div>
  );
} 