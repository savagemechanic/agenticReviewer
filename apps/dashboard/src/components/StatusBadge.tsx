import * as React from "react";
import { Badge } from "./ui/Badge";

export type ReviewStatus =
  | "published"
  | "processing"
  | "scored"
  | "draft"
  | "failed"
  | "pending"
  | "completed"
  | "archived";

export interface StatusBadgeProps {
  status: ReviewStatus;
  className?: string;
}

const statusConfig: Record<
  ReviewStatus,
  { label: string; variant: "success" | "warning" | "primary" | "default" | "danger" | "secondary" }
> = {
  published: { label: "Published", variant: "success" },
  processing: { label: "Processing", variant: "warning" },
  scored: { label: "Scored", variant: "primary" },
  draft: { label: "Draft", variant: "default" },
  failed: { label: "Failed", variant: "danger" },
  pending: { label: "Pending", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  archived: { label: "Archived", variant: "secondary" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
