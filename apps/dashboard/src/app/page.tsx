"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Package,
  Eye,
  Brain,
  Star,
  Video,
  Send,
  Play,
  Zap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/StatusBadge";
import { useStats } from "@/hooks/useStats";
import { useProducts } from "@/hooks/useProducts";
import { useActions } from "@/hooks/useActions";

const statusIcons = {
  discovered: Package,
  processing: Eye,
  summarized: Brain,
  scored: Star,
  video_ready: Video,
  published: Send,
};

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: recentProducts, isLoading: productsLoading } = useProducts({
    limit: 10,
  });
  const { triggerDiscovery } = useActions();
  const [isRunningDiscovery, setIsRunningDiscovery] = useState(false);

  const handleRunDiscovery = async () => {
    setIsRunningDiscovery(true);
    try {
      await triggerDiscovery.mutateAsync({});
    } finally {
      setIsRunningDiscovery(false);
    }
  };

  const handleProcessAll = async () => {
    // TODO: Implement process all action
    console.log("Process all clicked");
  };

  const totalProducts = stats?.totalProducts ?? 0;
  const productsByStatus = stats?.productsByStatus ?? {};

  const statuses = [
    "discovered",
    "processing",
    "summarized",
    "scored",
    "video_ready",
    "published",
  ];

  const statsCards = [
    { label: "Total Products", value: totalProducts, icon: Package, color: "text-indigo-400" },
    { label: "Discovered", value: productsByStatus.discovered ?? 0, icon: Eye, color: "text-blue-400" },
    { label: "Summarized", value: productsByStatus.summarized ?? 0, icon: Brain, color: "text-purple-400" },
    { label: "Scored", value: productsByStatus.scored ?? 0, icon: Star, color: "text-yellow-400" },
    { label: "Video Ready", value: productsByStatus.video_ready ?? 0, icon: Video, color: "text-green-400" },
    { label: "Published", value: productsByStatus.published ?? 0, icon: Send, color: "text-emerald-400" },
  ];

  const maxCount = Math.max(...statuses.map((s) => productsByStatus[s] ?? 0), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Pipeline Overview</h1>
          <p className="text-slate-400 mt-1">
            Monitor your product discovery and video pipeline
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleRunDiscovery}
            disabled={isRunningDiscovery || triggerDiscovery.isPending}
            variant="primary"
          >
            <Play className="w-4 h-4 mr-2" />
            Run Discovery
          </Button>
          <Button onClick={handleProcessAll} variant="secondary">
            <Zap className="w-4 h-4 mr-2" />
            Process All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="hover:border-slate-700 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">{label}</p>
                  <p className="text-3xl font-bold text-slate-50 mt-2">
                    {statsLoading ? "..." : value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-slate-800 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statuses.map((status, index) => {
              const count = productsByStatus[status] ?? 0;
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const Icon = statusIcons[status as keyof typeof statusIcons];

              return (
                <div key={status} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32">
                    {Icon && <Icon className="w-4 h-4 text-slate-400" />}
                    <span className="text-sm font-medium text-slate-300 capitalize">
                      {status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex-1 h-10 bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-500 flex items-center px-4 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    >
                      {count > 0 && (
                        <span className="text-sm font-semibold text-white">
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-sm text-slate-400">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Products Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Products</CardTitle>
            <Link href="/products">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">
                    Name
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">
                    Status
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">
                    Source
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {productsLoading && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      Loading products...
                    </td>
                  </tr>
                )}
                {!productsLoading && (!recentProducts || recentProducts.length === 0) && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No products yet. Run a discovery workflow to get started.
                    </td>
                  </tr>
                )}
                {!productsLoading &&
                  recentProducts?.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <Link
                          href={`/products/${product.id}`}
                          className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
                        >
                          {product.name}
                        </Link>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={product.status as any} />
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{product.source}</Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {product.createdAt
                          ? new Date(product.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
