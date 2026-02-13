"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

interface TriggerDiscoveryParams {
  source?: string;
}

interface RejectVideoParams {
  reason?: string;
}

interface DistributeVideoParams {
  videoId: string;
  platforms?: string[];
}

export function useActions() {
  const queryClient = useQueryClient();

  const triggerDiscovery = useMutation({
    mutationFn: (params: TriggerDiscoveryParams = {}) =>
      fetchApi("/discover", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const approveVideo = useMutation({
    mutationFn: (videoId: string) =>
      fetchApi(`/videos/${videoId}/approve`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const rejectVideo = useMutation({
    mutationFn: ({ videoId, reason }: { videoId: string; reason?: string }) =>
      fetchApi(`/videos/${videoId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const distributeVideo = useMutation({
    mutationFn: (params: DistributeVideoParams) =>
      fetchApi("/distribute", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  return {
    triggerDiscovery,
    approveVideo,
    rejectVideo,
    distributeVideo,
  };
}
