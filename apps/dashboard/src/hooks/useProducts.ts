"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  url: string;
  status: string;
  source: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProductsResponse {
  success: true;
  data: Product[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface UseProductsParams {
  status?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

export function useProducts(params: UseProductsParams = {}) {
  const queryParams = new URLSearchParams();

  if (params.status) queryParams.append("status", params.status);
  if (params.source) queryParams.append("source", params.source);
  if (params.limit !== undefined) queryParams.append("limit", params.limit.toString());
  if (params.offset !== undefined) queryParams.append("offset", params.offset.toString());

  const queryString = queryParams.toString();
  const path = `/products${queryString ? `?${queryString}` : ""}`;

  const { data, isLoading, error } = useQuery({
    queryKey: ["products", params],
    queryFn: () => fetchApi<ProductsResponse>(path),
  });

  return {
    data: data?.data,
    pagination: data?.pagination,
    isLoading,
    error,
  };
}
