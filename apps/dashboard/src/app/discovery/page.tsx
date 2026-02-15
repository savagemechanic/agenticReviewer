"use client";

import { useState } from "react";
import {
  Play,
  Check,
  Clock,
  AlertCircle,
  TrendingUp,
  Database,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusBadge, type ReviewStatus } from "@/components/StatusBadge";
import { useStats } from "@/hooks/useStats";
import { useActions } from "@/hooks/useActions";

export default function DiscoveryPage() {
  const { data: stats, isLoading } = useStats();
  const { triggerDiscovery } = useActions();
  const [isRunning, setIsRunning] = useState(false);

  const handleRunDiscovery = async () => {
    setIsRunning(true);
    try {
      await triggerDiscovery.mutateAsync({});
    } finally {
      setIsRunning(false);
    }
  };

  const recentRuns = stats?.recentDiscoveryRuns || [];

  const formatDuration = (start: string, end: string) => {
    if (!start || !end) return "N/A";
    const duration = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="w-4 h-4 text-green-400" />;
      case "running":
        return <Clock className="w-4 h-4 text-blue-400 animate-spin" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusVariant = (status: string): ReviewStatus => {
    switch (status) {
      case "completed":
        return "completed";
      case "running":
        return "processing";
      case "failed":
        return "failed";
      default:
        return "pending";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Discovery Runs</h1>
          <p className="text-slate-400 mt-1">
            Manage product discovery from external sources
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={handleRunDiscovery}
          disabled={isRunning || triggerDiscovery.isPending}
        >
          <Play className="w-5 h-5 mr-2" />
          Run Discovery Now
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Total Runs
                </p>
                <p className="text-3xl font-bold text-slate-50 mt-2">
                  {isLoading ? "..." : recentRuns.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800 text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Total Discovered
                </p>
                <p className="text-3xl font-bold text-slate-50 mt-2">
                  {isLoading
                    ? "..."
                    : recentRuns.reduce(
                        (acc, run) => acc + (run.productsFound || 0),
                        0
                      )}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800 text-green-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Success Rate
                </p>
                <p className="text-3xl font-bold text-slate-50 mt-2">
                  {isLoading
                    ? "..."
                    : recentRuns.length > 0
                    ? Math.round(
                        (recentRuns.filter((r) => r.status === "completed")
                          .length /
                          recentRuns.length) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800 text-blue-400">
                <Check className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discovery History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Discovery History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-slate-400">Loading discovery runs...</p>
            </div>
          )}

          {!isLoading && recentRuns.length === 0 && (
            <div className="text-center py-12">
              <div className="flex flex-col items-center">
                <div className="p-4 bg-slate-800 rounded-full mb-4">
                  <Database className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-400 text-lg">No discovery runs yet</p>
                <p className="text-slate-500 text-sm mt-2">
                  Click "Run Discovery Now" to start discovering products
                </p>
              </div>
            </div>
          )}

          {!isLoading && recentRuns.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left p-4 text-sm font-medium text-slate-400">
                      Source
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">
                      Status
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">
                      Products Found
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">
                      New Products
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">
                      Started
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">
                      Completed
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map((run, index) => (
                    <tr
                      key={run.id || index}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <Badge variant="outline">{run.source || "All"}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(run.status)}
                          <StatusBadge status={getStatusVariant(run.status)} />
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-200 font-medium">
                          {run.productsFound || 0}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-green-400 font-medium">
                          +{run.productsNew || 0}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {run.startedAt
                          ? new Date(run.startedAt).toLocaleString()
                          : "N/A"}
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {run.completedAt
                          ? new Date(run.completedAt).toLocaleString()
                          : run.status === "running"
                          ? "In progress..."
                          : "N/A"}
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {run.startedAt && run.completedAt
                          ? formatDuration(run.startedAt, run.completedAt)
                          : run.status === "running"
                          ? "Running..."
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
