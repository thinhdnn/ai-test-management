import { Metadata } from "next";
import { UserForm } from "@/components/users/user-form";

export const metadata: Metadata = {
  title: "Add New User",
  description: "Add a new user to the system",
};

export default function NewUserPage() {
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
