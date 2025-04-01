import { Metadata } from "next";

export const metadata: Metadata = {
  title: "RBAC Settings",
  description: "Manage role-based access control",
};

export default function RBACPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Role-Based Access Control</h1>
      <div className="bg-yellow-100 p-4 rounded-md">
        <p className="text-yellow-800">
          RBAC management is currently in maintenance. Please check back later.
        </p>
      </div>
    </div>
  );
}
