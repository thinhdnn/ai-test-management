"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProjectSettings } from "@/components/project/project-settings";
import { usePermission } from "@/lib/hooks/usePermission";

// Types
interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  browser: string;
  environment: string;
  library: string | null;
  createdAt: string;
  updatedAt: string;
  created_by: string | null;
  created_by_username: string | null;
  lastRunBy: string | null;
  lastRunBy_username: string | null;
  testCases: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
  };
}

export default function ProjectSettingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;
  const { hasPermission } = usePermission();
  const hasCheckedPermission = useRef(false);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedProject, setEditedProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  // Playwright configuration state
  const [playwrightConfig, setPlaywrightConfig] = useState({
    // Basic
    baseUrl: "",
    testDir: "tests",
    retries: 0,
    workers: 1,
    fullyParallel: false,

    // Emulation
    colorScheme: "light",
    locale: "en-US",
    timezoneId: "Asia/Ho_Chi_Minh",
    viewport: { width: 1920, height: 1080 },

    // Network
    ignoreHTTPSErrors: false,
    offline: false,
    proxy: "",

    // Recording
    screenshot: "only-on-failure",
    video: "on-first-retry",
    trace: "on-first-retry",

    // Advanced
    timeout: 30000,
    expectTimeout: 5000,
    outputDir: "test-results",

    // Reporters
    reporter: [['json'], ['html']],  // Default reporters
    reporters: ['json', 'html'],     // UI state for reporters
    reportFileNames: {} as Record<string, string>,
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Kiểm tra quyền riêng biệt trước khi thực hiện bất kỳ thao tác nào khác
  useEffect(() => {
    // Chỉ kiểm tra quyền một lần
    if (hasCheckedPermission.current) return;
    
    if (!hasPermission("project.view")) {
      toast.error("You don't have permission to view project settings");
      router.push(`/projects/${projectId}`);
      return;
    }
    
    hasCheckedPermission.current = true;
  }, [hasPermission, projectId, router]);

  // Chỉ fetch dữ liệu sau khi đã kiểm tra quyền
  useEffect(() => {
    if (!hasCheckedPermission.current) return;
    
    const abortController = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Đặt timeout để đảm bảo luôn kết thúc trạng thái loading
        timeoutId = setTimeout(() => {
          if (loading) {
            setLoading(false);
          }
        }, 15000);
        
        // Fetch project data
        const response = await fetch(`/api/projects/${projectId}`, {
          signal: abortController.signal
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            toast.error("Unauthorized access");
            router.push("/login");
            return;
          }
          
          if (response.status === 404) {
            setError("Project not found");
          } else {
            setError(`Failed to load project data (${response.status})`);
          }
          setLoading(false);
          return;
        }
        
        const projectData = await response.json();
        setProject(projectData);
        setEditedProject(projectData);
        
        // Fetch Playwright config after project data is loaded
        try {
          const configResponse = await fetch(`/api/projects/${projectId}/config`, {
            signal: abortController.signal
          });
          
          if (configResponse.ok) {
            const config = await configResponse.json();
            
            setPlaywrightConfig(prev => ({
              ...prev,
              baseUrl: config.url || prev.baseUrl,
              ...(config.browsers && { browsers: config.browsers }),
              ...(config.viewport && { viewport: config.viewport }),
              ...(config.testDir && { testDir: config.testDir }),
              ...(config.timeout !== undefined && { timeout: config.timeout }),
              reporters: config.reporter 
                ? config.reporter.map((r: any) => Array.isArray(r) ? r[0] : r) 
                : [],
              reportFileNames: config.reporter 
                ? config.reporter.reduce((acc: any, r: any) => {
                    if (Array.isArray(r) && r[1]?.outputFile) {
                      acc[r[0]] = r[1].outputFile;
                    }
                    return acc;
                  }, {}) 
                : {}
            }));
          }
        } catch (configError) {
          // Lỗi khi lấy config không nên ngăn hiển thị project
          console.error("Error fetching config:", configError);
        }
        
        setError(null);
        setLoading(false);
      } catch (err) {
        if ((err as any)?.name !== 'AbortError') {
          console.error("Error loading project:", err);
          setError("Error loading project details");
          setLoading(false);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };
    
    fetchData();
    
    return () => {
      abortController.abort();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [projectId, router, hasCheckedPermission.current]);

  const fetchPlaywrightConfig = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setConfigLoading(true);
      const response = await fetch(`/api/projects/${projectId}/config`);
      
      if (response.ok) {
        const config = await response.json();
        setPlaywrightConfig(prev => ({
          ...prev,
          baseUrl: config.url || prev.baseUrl,
          ...(config.browsers && { browsers: config.browsers }),
          ...(config.viewport && { viewport: config.viewport }),
          ...(config.testDir && { testDir: config.testDir }),
          ...(config.timeout !== undefined && { timeout: config.timeout }),
          reporters: config.reporter 
            ? config.reporter.map((r: any) => Array.isArray(r) ? r[0] : r) 
            : [],
          reportFileNames: config.reporter 
            ? config.reporter.reduce((acc: any, r: any) => {
                if (Array.isArray(r) && r[1]?.outputFile) {
                  acc[r[0]] = r[1].outputFile;
                }
                return acc;
              }, {}) 
            : {}
        }));
      }
    } catch (error) {
      console.error("Error fetching Playwright config:", error);
    } finally {
      setConfigLoading(false);
    }
  }, [projectId]);

  // Handles manual reset of loading state
  const handleManualLoadingReset = useCallback(() => {
    setLoading(false);
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!editedProject) return;
    setEditedProject({
      ...editedProject,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    if (!editedProject) return;
    setEditedProject({
      ...editedProject,
      [name]: value,
    });
  };

  const handleSave = async () => {
    if (!editedProject) return;

    // Kiểm tra quyền chỉnh sửa dự án
    if (!hasPermission("project.update")) {
      toast.error("You don't have permission to update project settings");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedProject),
      });

      if (!response.ok) {
        throw new Error("Failed to update project");
      }

      const updatedProject = await response.json();
      setProject(updatedProject);
      setEditMode(false);
      toast.success("Project updated successfully");
      
      // Trigger a project refresh in the layout
      const refreshEvent = new CustomEvent("refreshProject");
      document.dispatchEvent(refreshEvent);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update project");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProject(project);
    setEditMode(false);
  };

  // Function to handle input changes for Playwright configuration
  const handlePlaywrightConfigChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    section: string
  ) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === "checkbox";
    const fieldValue = isCheckbox
      ? (e.target as HTMLInputElement).checked
      : value;

    setPlaywrightConfig((prev) => {
      // Xử lý viewport đặc biệt vì nó là một object
      if (name === "pw-viewport-width") {
        return {
          ...prev,
          viewport: {
            ...prev.viewport,
            width: parseInt(value) || 1920,
          },
        };
      }

      if (name === "pw-viewport-height") {
        return {
          ...prev,
          viewport: {
            ...prev.viewport,
            height: parseInt(value) || 1080,
          },
        };
      }

      // Other fields
      const fieldName = name.replace("pw-", "");
      return {
        ...prev,
        [fieldName]: type === "number" ? Number(fieldValue) : fieldValue,
      };
    });
  };

  // Function to handle select changes for Playwright configuration
  const handlePlaywrightSelectChange = (name: string, value: string) => {
    setPlaywrightConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Function to handle checkbox changes for Playwright configuration
  const handlePlaywrightCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, checked } = e.target;
    const fieldName = name.replace("pw-", "");

    setPlaywrightConfig((prev) => ({
      ...prev,
      [fieldName]: checked,
    }));
  };

  // Function to handle reporter changes
  const handleReporterChange = (reporters: string[]) => {
    setPlaywrightConfig((prev) => ({
      ...prev,
      reporters,
    }));
  };

  // Function to handle report file name changes
  const handleReportFileNameChange = (reporter: string, fileName: string) => {
    setPlaywrightConfig((prev) => ({
      ...prev,
      reportFileNames: {
        ...prev.reportFileNames,
        [reporter]: fileName,
      },
    }));
  };

  // Function to save Playwright configuration
  const savePlaywrightConfig = async () => {
    // Kiểm tra quyền cập nhật cấu hình
    if (!hasPermission("project.configure")) {
      toast.error("You don't have permission to update Playwright configuration");
      return;
    }

    try {
      setIsSavingConfig(true);

      const requestBody = {
        baseUrl: playwrightConfig.baseUrl || project?.url,
        testDir: playwrightConfig.testDir,
        browsers: {
          chromium: project?.browser === "chromium",
          firefox: project?.browser === "firefox",
          webkit: project?.browser === "webkit",
          chrome: project?.browser === "chrome",
        },
        viewport: playwrightConfig.viewport,
        timeout: playwrightConfig.timeout,
        expectTimeout: playwrightConfig.expectTimeout,
        retries: playwrightConfig.retries,
        workers: playwrightConfig.workers,
        ignoreHTTPSErrors: playwrightConfig.ignoreHTTPSErrors,
        screenshot: playwrightConfig.screenshot,
        video: playwrightConfig.video,
        trace: playwrightConfig.trace,
        outputDir: playwrightConfig.outputDir,
        colorScheme: playwrightConfig.colorScheme,
        locale: playwrightConfig.locale,
        timezoneId: playwrightConfig.timezoneId,
        fullyParallel: playwrightConfig.fullyParallel,
        offline: playwrightConfig.offline,
        reporters: playwrightConfig.reporters,
        reportFileNames: playwrightConfig.reportFileNames,
      };

      const response = await fetch(`/api/projects/${projectId}/config`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        toast.success("Playwright configuration saved successfully");
        fetchPlaywrightConfig();
      } else {
        const errorData = await response.json();
        toast.error(
          `Error saving configuration: ${
            errorData.error || "An error occurred"
          }`
        );
      }
    } catch (error) {
      console.error("Error saving Playwright config:", error);
      toast.error("Failed to save Playwright configuration");
    } finally {
      setIsSavingConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-muted-foreground font-medium">Loading project settings...</p>
        <button 
          className="text-xs text-blue-500 hover:underline" 
          onClick={handleManualLoadingReset}
        >
          Click here if loading takes too long
        </button>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error || "Project not found"}</p>
      </div>
    );
  }

  return (
    <ProjectSettings
      project={project}
      editMode={editMode}
      setEditMode={(mode) => {
        // Kiểm tra quyền khi bật chế độ chỉnh sửa
        if (mode && !hasPermission("project.update")) {
          toast.error("You don't have permission to edit project settings");
          return;
        }
        setEditMode(mode);
      }}
      editedProject={editedProject}
      handleInputChange={handleInputChange}
      handleSelectChange={handleSelectChange}
      handleSave={handleSave}
      handleCancel={handleCancel}
      isSaving={isSaving}
      playwrightConfig={playwrightConfig}
      handlePlaywrightConfigChange={handlePlaywrightConfigChange}
      handlePlaywrightSelectChange={handlePlaywrightSelectChange}
      handlePlaywrightCheckboxChange={handlePlaywrightCheckboxChange}
      savePlaywrightConfig={savePlaywrightConfig}
      isSavingConfig={isSavingConfig}
      fetchPlaywrightConfig={fetchPlaywrightConfig}
      handleReporterChange={handleReporterChange}
      handleReportFileNameChange={handleReportFileNameChange}
    />
  );
} 