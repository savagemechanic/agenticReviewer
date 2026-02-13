import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-800",
        className
      )}
      {...props}
    />
  );
}

export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

export function SkeletonText({ className, lines = 3, ...props }: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 ? "80%" : "100%" }}
        />
      ))}
    </div>
  );
}

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SkeletonCard({ className, ...props }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-900 p-6",
        className
      )}
      {...props}
    >
      <Skeleton className="mb-4 h-6 w-1/3" />
      <SkeletonText lines={3} />
    </div>
  );
}
