"use client";

import { Button } from "@/components/ui/button";
import { ButtonProps } from "@/components/ui/button";
import { forwardRef } from "react";
import {
  ShortcutTooltip,
  formatShortcut,
} from "@/components/ui/shortcut-tooltip";
import { Plus } from "lucide-react";

interface CreateButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
  createText?: string;
  showIcon?: boolean;
}

const CreateButton = forwardRef<HTMLButtonElement, CreateButtonProps>(
  (
    {
      className,
      isLoading = false,
      loadingText = "Creating...",
      createText = "Create",
      showIcon = true,
      children,
      ...props
    },
    ref
  ) => {
    const buttonContent = (
      <>
        {showIcon && !isLoading && <Plus className="mr-2 h-4 w-4" />}
        {children || (isLoading ? loadingText : createText)}
      </>
    );

    return (
      <ShortcutTooltip
        shortcut={formatShortcut("Ctrl+N")}
        description="Create new"
      >
        <Button
          ref={ref}
          className={className}
          data-test-id="create-button"
          isLoading={isLoading}
          loadingText={loadingText}
          {...props}
        >
          {buttonContent}
        </Button>
      </ShortcutTooltip>
    );
  }
);

CreateButton.displayName = "CreateButton";

export { CreateButton };
