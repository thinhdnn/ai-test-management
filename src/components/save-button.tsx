"use client";

import { Button } from "@/components/ui/button";
import { ButtonProps } from "@/components/ui/button";
import { forwardRef } from "react";
import {
  ShortcutTooltip,
  formatShortcut,
} from "@/components/ui/shortcut-tooltip";

interface SaveButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
  saveText?: string;
}

const SaveButton = forwardRef<HTMLButtonElement, SaveButtonProps>(
  (
    {
      className,
      isLoading = false,
      loadingText = "Saving...",
      saveText = "Save",
      children,
      ...props
    },
    ref
  ) => {
    const buttonContent = children || (isLoading ? loadingText : saveText);

    return (
      <ShortcutTooltip
        shortcut={formatShortcut("Ctrl+S")}
        description="Save changes"
      >
        <Button
          ref={ref}
          className={className}
          data-test-id="save-button"
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

SaveButton.displayName = "SaveButton";

export { SaveButton };
