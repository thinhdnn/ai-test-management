"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LucideUsers, 
  LucideLayoutDashboard, 
  LucideCheckCircle, 
  LucideXCircle, 
  LucideListChecks,
  LucideCalendar
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  PieLabelRenderProps
} from "recharts";

interface DashboardStats {
  projectCount: number;
  testCaseCount: number;
  userCount: number;
  testCasesThisMonth: number;
  passedTestsCount: number;
  failedTestsCount: number;
  topContributors: {
    username: string;
    testCasesCreated: number;
  }[];
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  
  // Tạo một hàm fetchStats có thể được gọi trực tiếp từ sự kiện và từ useEffect
  const fetchStats = useCallback(async () => {
    console.log("fetchStats called at", new Date().toISOString());
    setLoading(true);
    
    try {
      // Fetch projects
      console.log("Fetching projects...");
      const projectsRes = await fetch('/api/projects?' + new Date().getTime(), {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!projectsRes.ok) {
        throw new Error(`Failed to fetch projects: ${projectsRes.status}`);
      }
      
      const projects = await projectsRes.json();
      console.log("Projects fetched:", projects.length);
      
      // Fetch users
      console.log("Fetching users...");
      const usersRes = await fetch('/api/users?' + new Date().getTime(), {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!usersRes.ok) {
        throw new Error(`Failed to fetch users: ${usersRes.status}`);
      }
      
      const users = await usersRes.json();
      console.log("Users fetched:", users.length);
      
      // Fetch all test cases
      console.log("Fetching test cases...");
      const testCasesPromises = projects.map((project: any) => 
        fetch(`/api/projects/${project.id}/test-cases?` + new Date().getTime(), {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch test cases for project ${project.id}: ${res.status}`);
          }
          return res.json();
        })
      );
      
      const testCasesByProject = await Promise.all(testCasesPromises);
      const allTestCases = testCasesByProject.flat();
      console.log("All test cases fetched:", allTestCases.length);
      
      // Calculate current month test cases
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const testCasesThisMonth = allTestCases.filter((tc: any) => 
        new Date(tc.createdAt) >= firstDayOfMonth
      ).length;
      
      // Count passed and failed tests
      const passedTestsCount = allTestCases.filter((tc: any) => 
        tc.status === 'passed'
      ).length;
      const failedTestsCount = allTestCases.filter((tc: any) => 
        tc.status === 'failed'
      ).length;
      
      // Create contributor stats
      const contributorMap = new Map();
      users.forEach((user: any) => {
        contributorMap.set(user.id, {
          username: user.username,
          testCasesCreated: 0
        });
      });
      
      // Count test cases by creator
      allTestCases.forEach((testCase: any) => {
        const creatorId = testCase.createdBy;
        if (creatorId && contributorMap.has(creatorId)) {
          const contributor = contributorMap.get(creatorId);
          contributor.testCasesCreated += 1;
          contributorMap.set(creatorId, contributor);
        }
      });
      
      // Get top contributors
      const topContributors = Array.from(contributorMap.values())
        .filter(contributor => contributor.testCasesCreated > 0)
        .sort((a, b) => b.testCasesCreated - a.testCasesCreated)
        .slice(0, 5);
      
      console.log("Processing complete, updating state...");
      
      // Set the stats
      const newStats = {
        projectCount: projects.length,
        testCaseCount: allTestCases.length,
        userCount: users.length,
        testCasesThisMonth,
        passedTestsCount,
        failedTestsCount,
        topContributors
      };
      
      console.log("Setting stats:", newStats);
      setStats(newStats);
      
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      console.log("Loading complete");
      setLoading(false);
    }
  }, []);

  // useEffect sẽ chạy khi component được mount và khi pathname thay đổi
  useEffect(() => {
    console.log("Dashboard useEffect triggered, pathname:", pathname);
    
    // Chỉ fetch khi đường dẫn là dashboard
    if (pathname === '/dashboard') {
      console.log("Dashboard path detected, fetching data");
      fetchStats();
    }
    
  }, [pathname, fetchStats]);
  
  // Thêm button để refresh data khi cần
  const handleRefresh = () => {
    console.log("Manual refresh triggered");
    fetchStats();
  };

  // Status chart data
  const statusData: ChartDataItem[] = stats ? [
    { name: "Passed", value: stats.passedTestsCount, color: "#10b981" },
    { name: "Failed", value: stats.failedTestsCount, color: "#ef4444" },
    { name: "Pending", value: stats.testCaseCount - stats.passedTestsCount - stats.failedTestsCount, color: "#f59e0b" }
  ] : [];

  // Custom label for pie chart
  const renderPieLabel = ({ name, percent }: PieLabelRenderProps) => {
    return `${name}: ${(percent ? percent * 100 : 0).toFixed(0)}%`;
  };

  return (
    <div className="container px-4 py-6 sm:px-6 md:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Refresh Data
        </button>
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Projects Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <LucideLayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.projectCount}</div>
            )}
          </CardContent>
        </Card>

        {/* Test Cases Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Test Cases
            </CardTitle>
            <LucideListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.testCaseCount}</div>
            )}
          </CardContent>
        </Card>

        {/* Users Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Users
            </CardTitle>
            <LucideUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.userCount}</div>
            )}
          </CardContent>
        </Card>

        {/* Test Cases This Month Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Test Cases Created This Month
            </CardTitle>
            <LucideCalendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.testCasesThisMonth}</div>
            )}
          </CardContent>
        </Card>

        {/* Passed Tests Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Passed Test Cases
            </CardTitle>
            <LucideCheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.passedTestsCount}</div>
            )}
          </CardContent>
        </Card>

        {/* Failed Tests Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Failed Test Cases
            </CardTitle>
            <LucideXCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.failedTestsCount}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Status Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Test Case Status</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={renderPieLabel}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Contributors */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Test Cases Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.topContributors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">No contributors found</TableCell>
                    </TableRow>
                  ) : (
                    stats?.topContributors.map((contributor) => (
                      <TableRow key={contributor.username}>
                        <TableCell className="font-medium">{contributor.username}</TableCell>
                        <TableCell className="text-right">{contributor.testCasesCreated}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 