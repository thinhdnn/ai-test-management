"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ProjectSettings } from "@/components/project/project-settings";

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
  const projectId = params.id;

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

  useEffect(() => {
    // Fetch project details
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Project not found");
          } else {
            setError("Failed to load project data");
          }
          return;
        }
        const data = await response.json();
        setProject(data);
        setEditedProject(data);
        setError(null);
      } catch (err) {
        setError("Error loading project details");
        console.error(err);
      } finally {
        // Add a small timeout to prevent flickering
        setTimeout(() => {
          setLoading(false);
        }, 100);
      }
    };

    fetchProject();
  }, [projectId]);

  useEffect(() => {
    // Get Playwright configuration when project is loaded
    if (project?.id) {
      fetchPlaywrightConfig();
    }
  }, [project?.id]);

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

  // Function to fetch Playwright configuration from API
  const fetchPlaywrightConfig = async () => {
    try {
      setConfigLoading(true);
      const response = await fetch(`/api/projects/${projectId}/config`);
      if (response.ok) {
        const config = await response.json();
        console.log('Received config:', config);

        // Update state with configuration from server
        setPlaywrightConfig((prev) => ({
          ...prev,
          baseUrl: config.url || prev.baseUrl,
          // Update other values if they exist in config
          ...(config.browsers && {
            browsers: config.browsers,
          }),
          ...(config.viewport && {
            viewport: config.viewport,
          }),
          ...(config.testDir && {
            testDir: config.testDir,
          }),
          ...(config.timeout !== undefined && {
            timeout: config.timeout,
          }),
          // Extract reporters from config
          reporters: config.reporter ? config.reporter.map((r: any) => 
            Array.isArray(r) ? r[0] : r
          ) : [],
          reportFileNames: config.reporter ? config.reporter.reduce((acc: any, r: any) => {
            if (Array.isArray(r) && r[1]?.outputFile) {
              acc[r[0]] = r[1].outputFile;
            }
            return acc;
          }, {}) : {}
        }));
      }
    } catch (error) {
      console.error("Error fetching Playwright config:", error);
    } finally {
      setConfigLoading(false);
    }
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

      console.log('Saving config with:', requestBody);

      const response = await fetch(`/api/projects/${projectId}/config`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        toast.success("Playwright configuration saved successfully");
        fetchPlaywrightConfig(); // Update configuration
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
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading project settings...</p>
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
      setEditMode={setEditMode}
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