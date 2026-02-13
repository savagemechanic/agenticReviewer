"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

interface Video {
  id: string;
  productId: string;
  status: string;
  scriptPath?: string;
  videoPath?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface VideosResponse {
  success: true;
  data: Video[];
}

interface UseVideosParams {
  status?: string;
}

export function useVideos(params: UseVideosParams = {}) {
  const queryParams = new URLSearchParams();

  if (params.status) queryParams.append("status", params.status);

  const queryString = queryParams.toString();
  const path = `/videos${queryString ? `?${queryString}` : ""}`;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["videos", params],
    queryFn: () => fetchApi<VideosResponse>(path),
  });

  return {
    data: data?.data,
    isLoading,
    error,
    refetch,
  };
}
