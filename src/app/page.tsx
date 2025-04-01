import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col items-center justify-center space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
          Playwright Gemini
        </h1>
        <p className="max-w-[700px] text-lg text-muted-foreground">
          Automated testing project management platform with Playwright
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/projects">View Projects</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/projects/new">Create New Project</Link>
          </Button>
        </div>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Project Management</CardTitle>
            <CardDescription>
              Create and manage your testing projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Create new projects with details like URL, browser, environment,
              and libraries. Track the status and progress of each project.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/projects">View Projects</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Case Management</CardTitle>
            <CardDescription>
              Create and manage test cases for projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Create test cases with detailed testing steps. Monitor the status
              and results of each test case.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/projects">View Test Cases</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation with Playwright</CardTitle>
            <CardDescription>
              Run automated test cases with Playwright
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Automate testing with Playwright. View results and detailed
              reports after running tests.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/projects">Get Started</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
