"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "ghost" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function Button({
  className,
  variant = "primary",
  size = "default",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800":
            variant === "primary" && !disabled,
          "bg-red-600 text-white hover:bg-red-700 active:bg-red-800":
            variant === "danger" && !disabled,
          "hover:bg-slate-800 hover:text-slate-50 active:bg-slate-700":
            variant === "ghost" && !disabled,
          "border border-slate-700 bg-transparent hover:bg-slate-800 hover:text-slate-50":
            variant === "outline" && !disabled,
          "bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-600":
            variant === "secondary" && !disabled,
        },
        {
          "h-10 px-4 py-2": size === "default",
          "h-9 rounded-md px-3 text-xs": size === "sm",
          "h-11 rounded-lg px-8 text-base": size === "lg",
          "h-10 w-10 p-0": size === "icon",
        },
        className
      )}
      disabled={disabled}
      {...props}
    />
  );
}
