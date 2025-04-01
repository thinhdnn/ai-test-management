import React, { createContext, useContext, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepperContextProps {
  activeStep: number;
  setActiveStep: (step: number) => void;
}

const StepperContext = createContext<StepperContextProps | undefined>(
  undefined
);

function useStepperContext() {
  const context = useContext(StepperContext);
  if (!context) {
    throw new Error("useStepperContext must be used within a Stepper");
  }
  return context;
}

interface StepperProps {
  children: ReactNode;
  className?: string;
  initialStep?: number;
}

export function Stepper({
  children,
  className,
  initialStep = 0,
}: StepperProps) {
  const [activeStep, setActiveStep] = useState(initialStep);

  const childrenArray = React.Children.toArray(children).filter(Boolean);
  const steps = childrenArray.map((child, index) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        ...child.props,
        stepIndex: index,
        isActive: index === activeStep,
        isCompleted: index < activeStep,
        isLast: index === childrenArray.length - 1,
      });
    }
    return child;
  });

  return (
    <StepperContext.Provider value={{ activeStep, setActiveStep }}>
      <div className={cn("flex flex-col space-y-6", className)}>{steps}</div>
    </StepperContext.Provider>
  );
}

interface StepProps {
  children?: ReactNode;
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  stepIndex?: number;
  isActive?: boolean;
  isCompleted?: boolean;
  isLast?: boolean;
}

export function Step({
  children,
  title,
  description,
  icon,
  className,
  stepIndex = 0,
  isActive = false,
  isCompleted = false,
  isLast = false,
}: StepProps) {
  const { setActiveStep } = useStepperContext();

  return (
    <div
      className={cn("flex flex-col", className, {
        "opacity-50": !isActive && !isCompleted,
      })}
    >
      <div className="flex items-center">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border border-border text-sm font-medium",
            {
              "bg-primary text-primary-foreground": isActive,
              "bg-primary text-primary-foreground": isCompleted,
              "cursor-pointer hover:bg-muted": !isActive && !isLast,
            }
          )}
          onClick={() => {
            if (!isActive && !isLast) {
              setActiveStep(stepIndex);
            }
          }}
        >
          {isCompleted ? (
            <Check className="h-5 w-5" />
          ) : icon ? (
            icon
          ) : (
            stepIndex + 1
          )}
        </div>

        {!isLast && (
          <div
            className={cn("ml-4 h-px flex-1 bg-border", {
              "bg-primary": isCompleted,
            })}
          />
        )}
      </div>

      <div className="ml-14 mt-2">
        <h3 className="font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {isActive && children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
