"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  role: string;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to safely access localStorage (avoids SSR issues)
const getLocalStorage = () => {
  if (typeof window !== "undefined") {
    return window.localStorage;
  }
  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check authentication status when page loads
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);

      // Try to restore from localStorage first
      const localStorage = getLocalStorage();
      let storedUser = null;
      let storedToken = null;

      if (localStorage) {
        const storedData = localStorage.getItem("auth_user");
        if (storedData) {
          try {
            storedUser = JSON.parse(storedData);
            storedToken = storedUser?.token;
            console.log(
              "📋 User restored from localStorage:",
              storedUser.username
            );
          } catch (e) {
            console.error("❌ Error parsing localStorage data:", e);
          }
        }
      }

      try {
        // Verify token with database first if we have one
        if (storedToken) {
          console.log("🔄 Verifying token with API...");
          const verifyResponse = await fetch("/api/auth/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: storedToken }),
          });

          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            if (!verifyData.valid) {
              console.log("❌ Token verification failed:", verifyData.message);
              // Clear user data and continue to API check
              setUser(null);
              if (localStorage) {
                localStorage.removeItem("auth_user");
              }
            } else {
              console.log(
                "✅ Token verification successful:",
                verifyData.user.username
              );
              // Update user data from verification
              setUser({
                ...verifyData.user,
                token: storedToken,
              });
              // Continue with normal auth check
            }
          }
        }

        // Check with API regardless
        console.log("🔄 Checking authentication with API...");
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          // console.log("✅ API authentication successful:", userData);
          setUser(userData);

          // Update localStorage if needed
          if (localStorage && userData.token) {
            localStorage.setItem("auth_user", JSON.stringify(userData));
          }
        } else {
          // API error, clear user data
          console.log("❌ API authentication failed:", response.status);
          setUser(null);

          // Remove data from localStorage
          if (localStorage) {
            localStorage.removeItem("auth_user");
          }

          // Redirect to login if not already there
          if (window.location.pathname !== "/login") {
            console.log("🔄 Redirecting to login page after auth failure");
            router.push("/login");
          }
        }
      } catch (error) {
        console.error("❌ Authentication check error:", error);

        // Do not use storedUser if API check fails
        setUser(null);

        // Clear localStorage on API error
        if (localStorage) {
          localStorage.removeItem("auth_user");
        }

        // Redirect to login if not already there
        if (window.location.pathname !== "/login") {
          console.log("🔄 Redirecting to login page after auth error");
          router.push("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Login function
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    console.log("🔄 Starting login process for user:", username);

    try {
      console.log("📡 Sending login request to API...");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include", // Include cookies in request
      });

      console.log("📊 Login response status:", response.status);

      const data = await response.json();
      console.log("📦 Login response data:", data);

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Save user data
      console.log("💾 Saving user data to state...");
      setUser(data);

      // Save to localStorage for session persistence
      const localStorage = getLocalStorage();
      if (localStorage) {
        console.log("💽 Saving user data to localStorage");
        localStorage.setItem("auth_user", JSON.stringify(data));
      }

      toast.success("Login successful");
      console.log("✅ Login process completed");
    } catch (error) {
      console.error("❌ Login error:", error);
      toast.error(error instanceof Error ? error.message : "Login failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // Include cookies in the request
      });

      // Clear user state
      setUser(null);

      // Clear localStorage
      const localStorage = getLocalStorage();
      if (localStorage) {
        localStorage.removeItem("auth_user");
      }

      toast.success("Logout successful");
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error("Logout failed");
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
