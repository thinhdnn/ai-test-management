"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Project } from "@prisma/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Globe, Monitor, FileBox, Laptop } from "lucide-react";

type ProjectsListProps = {
  projects: Project[];
};

export function ProjectsList({ projects }: ProjectsListProps) {
  const getBrowserIcon = (browser: string) => {
    switch (browser.toLowerCase()) {
      case 'chrome':
        return <Monitor className="h-4 w-4" />;
      case 'firefox':
        return <FileBox className="h-4 w-4" />;
      case 'edge':
        return <Laptop className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full w-full grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {projects.map((project) => (
        <Link href={`/projects/${project.id}`} key={project.id} className="h-full w-full">
          <Card className="hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="truncate">{project.name}</span>
                {getBrowserIcon(project.browser)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground truncate">
                  {project.url}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{project.env}</Badge>
                  {project.lib && <Badge variant="secondary">{project.lib}</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}