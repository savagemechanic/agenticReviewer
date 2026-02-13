import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
        {
          "border-transparent bg-slate-700 text-slate-100 hover:bg-slate-600":
            variant === "default",
          "border-transparent bg-indigo-600 text-white hover:bg-indigo-700":
            variant === "primary",
          "border-transparent bg-slate-800 text-slate-300 hover:bg-slate-700":
            variant === "secondary",
          "border-transparent bg-green-600 text-white hover:bg-green-700":
            variant === "success",
          "border-transparent bg-yellow-600 text-white hover:bg-yellow-700":
            variant === "warning",
          "border-transparent bg-red-600 text-white hover:bg-red-700":
            variant === "danger",
          "border-slate-700 text-slate-300 hover:bg-slate-800":
            variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}
