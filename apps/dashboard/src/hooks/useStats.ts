"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

interface StatsData {
  totalProducts: number;
  productsByStatus: Record<string, number>;
  videosByStatus: Record<string, number>;
  recentDiscoveryRuns: any[];
}

interface StatsResponse {
  success: true;
  data: StatsData;
}

export function useStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchApi<StatsResponse>("/stats"),
  });

  return {
    data: data?.data,
    isLoading,
    error,
  };
}
