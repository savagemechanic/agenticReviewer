"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

interface Video {
  id: string;
  productId: string;
  status: string;
  format: string;
  durationSec: number;
  createdAt: string;
}

export default function VideosPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: () => fetchApi<{ data: Video[] }>("/products").then((r) => r.data), // TODO: proper videos endpoint
  });

  const approveMutation = useMutation({
    mutationFn: async (videoId: string) => {
      // TODO: Call API to approve video and trigger n8n webhook
      await fetchApi(`/video/${videoId}/approve`, { method: "POST" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["videos"] }),
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Video Review Queue</h2>
      {isLoading && <p className="text-slate-400">Loading...</p>}
      <div className="space-y-4">
        <p className="text-slate-500 text-center py-8">
          Videos awaiting approval will appear here. Approve them to trigger distribution.
        </p>
      </div>
    </div>
  );
}
