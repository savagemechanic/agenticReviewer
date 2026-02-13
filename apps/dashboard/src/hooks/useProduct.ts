"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

interface ProductDetail {
  id: string;
  name: string;
  url: string;
  status: string;
  source: string;
  screenshots?: string[];
  summary?: string;
  score?: number;
  videos?: any[];
  createdAt?: string;
  updatedAt?: string;
}

interface ProductResponse {
  success: true;
  data: ProductDetail;
}

export function useProduct(id: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchApi<ProductResponse>(`/products/${id}`),
    enabled: !!id,
  });

  return {
    data: data?.data,
    isLoading,
    error,
    refetch,
  };
}
