import * as React from "react";
import { Badge } from "./ui/Badge";

export type ReviewStatus =
  | "discovered"
  | "published"
  | "processing"
  | "processed"
  | "scored"
  | "summarized"
  | "video_ready"
  | "draft"
  | "failed"
  | "pending"
  | "completed"
  | "rendering"
  | "rendered"
  | "approved"
  | "publishing"
  | "rejected"
  | "archived";

export interface StatusBadgeProps {
  status: ReviewStatus;
  className?: string;
}

const statusConfig: Record<
  ReviewStatus,
  { label: string; variant: "success" | "warning" | "primary" | "default" | "danger" | "secondary" }
> = {
  discovered: { label: "Discovered", variant: "default" },
  published: { label: "Published", variant: "success" },
  processing: { label: "Processing", variant: "warning" },
  processed: { label: "Processed", variant: "primary" },
  scored: { label: "Scored", variant: "primary" },
  summarized: { label: "Summarized", variant: "primary" },
  video_ready: { label: "Video Ready", variant: "success" },
  draft: { label: "Draft", variant: "default" },
  failed: { label: "Failed", variant: "danger" },
  pending: { label: "Pending", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  rendering: { label: "Rendering", variant: "warning" },
  rendered: { label: "Rendered", variant: "primary" },
  approved: { label: "Approved", variant: "success" },
  publishing: { label: "Publishing", variant: "warning" },
  rejected: { label: "Rejected", variant: "danger" },
  archived: { label: "Archived", variant: "secondary" },
};

export function StatusBadge({ status, className }: StatusBadgeProps): React.ReactElement {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
