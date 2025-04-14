"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FixturesTab } from "@/components/project/fixtures-tab";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { usePermission } from "@/lib/hooks/usePermission";

interface Project {
  id: string;
  name: string;
}

export default function ProjectFixturesPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [loading, setLoading] = useState(true);
  const [projectLoading, setProjectLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const router = useRouter();
  const { hasPermission } = usePermission();
  
  // State cho dialog tạo fixture
  const [showNewFixtureDialog, setShowNewFixtureDialog] = useState(false);
  const [newFixture, setNewFixture] = useState({
    name: "",
    description: "",
    type: "setup"
  });

  // Fetch project data to ensure it exists
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setProjectLoading(true);
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          setProject(data);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setProjectLoading(false);
      }
    };

    // Fetch fixtures data or other necessary data
    const fetchFixturesData = async () => {
      try {
        setFixturesLoading(true);
        // Add API call here if needed to fetch fixtures data
      } catch (error) {
        console.error("Error fetching fixtures data:", error);
      } finally {
        setFixturesLoading(false);
      }
    };

    Promise.all([fetchProject(), fetchFixturesData()])
      .finally(() => {
        setLoading(false);
      });
  }, [projectId]);

  // Hàm xử lý tạo fixture mới
  const handleCreateFixture = async () => {
    // Kiểm tra quyền tạo fixture
    if (!hasPermission("testcase.create")) {
      toast.error("You don't have permission to create fixtures");
      return;
    }

    try {
      // Tạo tên file dựa trên tên fixture (loại bỏ ký tự đặc biệt, thay khoảng trắng bằng dấu gạch dưới)
      const safeFileName = newFixture.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .trim();
      
      // Tạo đường dẫn tương đối đến file fixture
      const fixtureFilePath = `fixtures/${safeFileName}`;
      const fixtureFileName = `${safeFileName}.js`;
      
      // Gửi yêu cầu tạo fixture với đầy đủ thông tin metadata
      const response = await fetch(`/api/projects/${projectId}/fixtures`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newFixture,
          filename: fixtureFileName,
          path: fixtureFilePath,
          exportName: newFixture.name.replace(/[^a-z0-9]/gi, '').toLowerCase()
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create fixture");
      }

      const data = await response.json();
      
      // Đóng dialog trước khi chuyển trang
      setShowNewFixtureDialog(false);
      
      toast.success("Fixture created successfully");
      
      // Redirect đến trang fixture detail
      router.push(`/projects/${projectId}/fixtures/${data.id}`);
    } catch (error) {
      console.error("Error creating fixture:", error);
      toast.error("Failed to create fixture");
    }
  };

  // Hàm kiểm tra quyền và mở dialog tạo fixture
  const handleOpenCreateDialog = () => {
    // Kiểm tra quyền trước khi mở dialog tạo fixture
    if (!hasPermission("testcase.create")) {
      toast.error("You don't have permission to create fixtures");
      return;
    }
    setShowNewFixtureDialog(true);
  };

  // Loading state for the entire page
  if (loading || projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading fixtures...</p>
      </div>
    );
  }

  // Check if project exists - chỉ kiểm tra khi đã load xong
  if (!loading && !projectLoading && !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Project not found. Please check the URL and try again.</p>
      </div>
    );
  }

  return (
    <>
      <FixturesTab projectId={projectId} />
      
      {/* Nút tạo fixture mới với kiểm tra quyền */}
      <div className="flex justify-end mt-4 mb-6">
        <Button onClick={handleOpenCreateDialog}>
          Create New Fixture
        </Button>
      </div>
      
      {/* Dialog tạo fixture mới */}
      <Dialog open={showNewFixtureDialog} onOpenChange={setShowNewFixtureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Fixture</DialogTitle>
            <DialogDescription>
              Add a new fixture to your project. Fixtures help set up test data and states.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={newFixture.name}
                onChange={(e) => setNewFixture({...newFixture, name: e.target.value})}
                placeholder="Enter fixture name" 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description"
                value={newFixture.description}
                onChange={(e) => setNewFixture({...newFixture, description: e.target.value})}
                placeholder="Describe what this fixture does"
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select 
                value={newFixture.type}
                onValueChange={(value) => setNewFixture({...newFixture, type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fixture type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="setup">Setup</SelectItem>
                  <SelectItem value="teardown">Teardown</SelectItem>
                  <SelectItem value="data">Test Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleCreateFixture}
              disabled={!newFixture.name.trim()}
            >
              Create Fixture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 