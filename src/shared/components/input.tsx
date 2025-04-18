import * as React from "react";

import { cn } from "@/shared/utils/cn-utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  errorClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type,
    label,
    description,
    error,
    containerClassName,
    labelClassName,
    descriptionClassName,
    errorClassName,
    ...props 
  }, ref) => {
    if (label || description || error) {
      return (
        <div className={cn("space-y-2", containerClassName)}>
          {label && (
            <label 
              htmlFor={props.id} 
              className={cn(
                "text-sm font-medium text-white/90",
                labelClassName
              )}
            >
              {label}
            </label>
          )}
          
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-sm text-white/90 placeholder:text-white/40 outline-hidden focus:bg-white/[0.03] focus:border-white/[0.1] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-red-500/30 focus:border-red-500/50",
              className,
            )}
            ref={ref}
            {...props}
          />
          
          {description && !error && (
            <p className={cn("text-xs text-white/60", descriptionClassName)}>
              {description}
            </p>
          )}
          
          {error && (
            <p className={cn("text-xs text-red-400", errorClassName)}>
              {error}
            </p>
          )}
        </div>
      );
    }
    
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-sm text-white/90 placeholder:text-white/40 outline-hidden focus:bg-white/[0.03] focus:border-white/[0.1] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
