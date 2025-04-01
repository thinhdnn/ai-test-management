import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  Settings,
  PlayCircle,
  Check,
  Copy,
  CheckCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useParams } from "next/navigation";
import { TestCase } from "@/types";

interface AIGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCase: TestCase | null;
}

export function AIGuideDialog({
  open,
  onOpenChange,
  testCase,
}: AIGuideDialogProps) {
  const [copied, setCopied] = useState(false);
  const [apiUrl, setApiUrl] = useState("");

  // Get API Analyze URL from testCase
  useEffect(() => {
    if (testCase) {
      const url = `${window.location.origin}/api/gemini/playwright?testCaseId=${testCase.id}`;
      setApiUrl(url);
    }
  }, [testCase]);

  const handleCopyClick = () => {
    navigator.clipboard.writeText(apiUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Playwright Recorder Guide</DialogTitle>
          <DialogDescription>
            Use Chrome extension to automatically record actions and create test
            cases
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-8">
          {/* Step 1 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-medium">1. Download Extension</h3>
              <p className="text-sm text-muted-foreground">
                Download the Playwright Recorder Chrome extension from the
                application.
              </p>
              <Button variant="outline" className="mt-2" asChild>
                <a href="/ext/playwright-recorder.zip" download>
                  Download Extension
                </a>
              </Button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              <Settings className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-medium">2. Install Extension</h3>
              <p className="text-sm text-muted-foreground">
                Open Chrome's extension management page at{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  chrome://extensions
                </code>
              </p>
              <p className="text-sm text-muted-foreground">
                Drag and drop the <strong>playwright-recorder.crx</strong> file
                onto this page and confirm the installation.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              <PlayCircle className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-medium">3. Configure and Use</h3>
              <p className="text-sm text-muted-foreground">
                Click on the Playwright Recorder extension icon in Chrome's
                toolbar.
              </p>
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">
                  Use this API Analyze URL in the extension:
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={apiUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyClick}
                    className="min-w-10"
                  >
                    {copied ? (
                      <CheckCheck className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Start recording actions by clicking the "Start Recording" button
                in the extension.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-medium">4. Complete</h3>
              <p className="text-sm text-muted-foreground">
                When you're done recording, click "Stop Recording" on the
                extension.
              </p>
              <p className="text-sm text-muted-foreground">
                Each recorded action will automatically be converted into a test
                step in your current test case.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
