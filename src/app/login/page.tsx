"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";

const loginSchema = z.object({
  username: z.string().min(3, {
    message: "Username must contain at least 3 characters",
  }),
  password: z.string().min(6, {
    message: "Password must contain at least 6 characters",
  }),
});

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, user } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const fromPath = searchParams.get("from") || "/";

  useEffect(() => {
    // Debug: log cookie và trạng thái người dùng
    console.log("Cookies:", document.cookie);
    console.log("From path:", fromPath);
    console.log("Current user state:", user);

    if (user) {
      console.log("🔐 User already logged in, redirecting to home page");
      router.replace("/");
    }
  }, [user, router, fromPath]);

  useEffect(() => {
    // Ensure authentication check when page loads
    const checkAuthentication = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          console.log("🔄 API /me returned OK, waiting for user state update");
          // User state will be updated through context
        }
      } catch (error) {
        console.error("❌ Authentication check error:", error);
      }
    };

    checkAuthentication();
  }, []);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setLoginError(null);
    try {
      console.log("🔐 Logging in with username:", values.username);

      // Add timestamp to track login timing
      const startTime = Date.now();
      await login(values.username, values.password);
      console.log(`✅ Login API completed in ${Date.now() - startTime}ms`);

      // Refresh router to ensure latest state
      router.refresh();

      // Redirect after successful login
      console.log(
        "🚀 Login successful, redirecting to:",
        fromPath === "/login" ? "/" : fromPath
      );
      router.push(fromPath === "/login" ? "/" : fromPath);
    } catch (error) {
      console.error("❌ Login form error:", error);
      setLoginError(error instanceof Error ? error.message : "Login failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-md w-full px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Playwright Gemini</h1>
          <p className="text-muted-foreground mt-2">Log in to your account</p>
        </div>
        {loginError && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-sm">
            {loginError}
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
