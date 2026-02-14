"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { StatusBadge, type ReviewStatus } from "@/components/StatusBadge";
import { ScoreRing } from "@/components/ScoreRing";
import { useProducts } from "@/hooks/useProducts";

const PRODUCTS_PER_PAGE = 12;

export default function ProductsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);

  const offset = currentPage * PRODUCTS_PER_PAGE;

  const { data: products, pagination, isLoading } = useProducts({
    status: statusFilter || undefined,
    source: sourceFilter || undefined,
    limit: PRODUCTS_PER_PAGE,
    offset,
  });

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "discovered", label: "Discovered" },
    { value: "processing", label: "Processing" },
    { value: "summarized", label: "Summarized" },
    { value: "scored", label: "Scored" },
    { value: "video_ready", label: "Video Ready" },
    { value: "published", label: "Published" },
  ];

  const sourceOptions = [
    { value: "", label: "All Sources" },
    { value: "producthunt", label: "Product Hunt" },
    { value: "reddit", label: "Reddit" },
    { value: "manual", label: "Manual" },
  ];

  const filteredProducts = products?.filter((product) => {
    if (!searchQuery) return true;
    return product.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalPages = Math.ceil((pagination?.total ?? 0) / PRODUCTS_PER_PAGE);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (hasPrevPage) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + "...";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Products</h1>
        <p className="text-slate-400 mt-1">
          Browse and manage discovered products
        </p>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(0);
              }}
            />

            <Select
              options={sourceOptions}
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setCurrentPage(0);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading products...</p>
        </div>
      )}

      {!isLoading && (!filteredProducts || filteredProducts.length === 0) && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-400 text-lg">No products found</p>
            <p className="text-slate-500 text-sm mt-2">
              Try adjusting your filters or run a discovery workflow
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && filteredProducts && filteredProducts.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <Card className="h-full hover:border-indigo-700 transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Product Name */}
                      <div>
                        <h3 className="text-lg font-semibold text-slate-50 group-hover:text-indigo-400 transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                      </div>

                      {/* URL */}
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate" title={product.url}>
                          {truncateUrl(product.url)}
                        </span>
                      </div>

                      {/* Status and Source */}
                      <div className="flex items-center justify-between">
                        <StatusBadge status={product.status as ReviewStatus} />
                        <Badge variant="outline">{product.source}</Badge>
                      </div>

                      {/* Score Ring (if scored) */}
                      {product.status === "scored" ||
                      product.status === "video_ready" ||
                      product.status === "published" ? (
                        <div className="flex justify-center pt-4">
                          <ScoreRing
                            score={Math.floor(Math.random() * 40) + 60}
                            size={80}
                            strokeWidth={6}
                            showLabel={true}
                            animated={false}
                          />
                        </div>
                      ) : (
                        <div className="h-[80px]" />
                      )}

                      {/* Date */}
                      <div className="text-xs text-slate-500 pt-2 border-t border-slate-800">
                        {product.createdAt
                          ? new Date(product.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "Date unavailable"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Showing {offset + 1} to{" "}
              {Math.min(offset + PRODUCTS_PER_PAGE, pagination?.total ?? 0)} of{" "}
              {pagination?.total ?? 0} products
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={!hasPrevPage}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasNextPage}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
