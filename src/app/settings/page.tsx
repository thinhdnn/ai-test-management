"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePermission } from "@/lib/hooks/usePermission";

export default function SettingsPage() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Kiểm tra quyền người dùng
  useEffect(() => {
    if (!hasPermission("settings.view")) {
      toast.error("You don't have permission to view settings");
      router.push("/");
      return;
    }
  }, [hasPermission, router]);

  // Fetch initial settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', {
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }
        
        const settingsData = await response.json();
        
        // Convert array to object for easier access
        const settings: Record<string, string> = {};
        settingsData.forEach((setting: { key: string; value: string }) => {
          settings[setting.key] = setting.value;
        });
        
        setFormData(settings);
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    // Kiểm tra quyền cập nhật settings
    if (!hasPermission("settings.update")) {
      toast.error("You don't have permission to update settings");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteName">Site Name</Label>
            <Input
              id="siteName"
              value={formData.siteName || ''}
              onChange={(e) => handleInputChange('siteName', e.target.value)}
              disabled={!hasPermission("settings.update")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteDescription">Site Description</Label>
            <Input
              id="siteDescription"
              value={formData.siteDescription || ''}
              onChange={(e) => handleInputChange('siteDescription', e.target.value)}
              disabled={!hasPermission("settings.update")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-4">
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || !hasPermission("settings.update")}
        >
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
