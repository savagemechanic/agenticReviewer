"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Play,
  Check,
  X,
  FileVideo,
  Clock,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusBadge, type ReviewStatus } from "@/components/StatusBadge";
import { ScoreRing } from "@/components/ScoreRing";
import { useProduct } from "@/hooks/useProduct";

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const { data: product, isLoading } = useProduct(productId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-slate-400">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-400 text-lg">Product not found</p>
            <Link href="/products">
              <Button variant="primary" className="mt-4">
                Back to Products
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  interface SummaryData {
    content?: string;
    keyFeatures?: string[];
    pros?: string[];
    cons?: string[];
  }

  interface ScoreData {
    scores?: Record<string, number>;
    overall?: number;
    reasoning?: string;
  }

  // Parse summary if it's a JSON string
  let summaryData: SummaryData = {};
  try {
    if (product.summary && typeof product.summary === "string") {
      summaryData = JSON.parse(product.summary) as SummaryData;
    } else if (product.summary && typeof product.summary === "object") {
      summaryData = product.summary as SummaryData;
    }
  } catch {
    summaryData = { content: String(product.summary) };
  }

  // Parse score data
  let scoreData: ScoreData = {};
  if (product.score && typeof product.score === "object") {
    scoreData = product.score as ScoreData;
  }

  const scores = scoreData.scores ?? {};
  const overallScore = scoreData.overall ?? 0;
  const reasoning = scoreData.reasoning ?? "";

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/products">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>
      </Link>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-3xl">{product.name}</CardTitle>
                <StatusBadge status={product.status as ReviewStatus} />
              </div>
              <CardDescription className="flex items-center gap-2 text-base">
                <ExternalLink className="w-4 h-4" />
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  {product.url}
                </a>
              </CardDescription>
              <div className="mt-3">
                <Badge variant="outline">{product.source}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm">
                <Play className="w-4 h-4 mr-2" />
                Generate Video
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Screenshots Section */}
      {product.screenshots && product.screenshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Screenshots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {product.screenshots.map((screenshot: string | { url: string; type?: string }, index: number) => {
                const screenshotUrl =
                  typeof screenshot === "string" ? screenshot : screenshot.url;
                const screenshotType =
                  typeof screenshot === "object" ? screenshot.type : "general";

                return (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <img
                      src={screenshotUrl}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <Badge variant="secondary" className="text-xs">
                        {screenshotType}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Section */}
      {summaryData && Object.keys(summaryData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {summaryData.content && (
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 leading-relaxed">
                  {summaryData.content}
                </p>
              </div>
            )}

            {summaryData.keyFeatures && summaryData.keyFeatures.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-3">
                  Key Features
                </h4>
                <div className="flex flex-wrap gap-2">
                  {summaryData.keyFeatures.map(
                    (feature: string, index: number) => (
                      <Badge key={index} variant="primary">
                        {feature}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {summaryData.pros && summaryData.pros.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Pros
                  </h4>
                  <ul className="space-y-2">
                    {summaryData.pros.map((pro: string, index: number) => (
                      <li
                        key={index}
                        className="text-sm text-slate-300 flex items-start gap-2"
                      >
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summaryData.cons && summaryData.cons.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Cons
                  </h4>
                  <ul className="space-y-2">
                    {summaryData.cons.map((con: string, index: number) => (
                      <li
                        key={index}
                        className="text-sm text-slate-300 flex items-start gap-2"
                      >
                        <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scores Section */}
      {(overallScore > 0 || Object.keys(scores).length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-6 gap-8">
              {/* Individual Scores */}
              {Object.keys(scores).length > 0 &&
                Object.entries(scores).map(([key, value]) => (
                  <div key={key} className="flex flex-col items-center">
                    <ScoreRing
                      score={value}
                      maxScore={100}
                      size={100}
                      strokeWidth={8}
                      showLabel={true}
                      animated={true}
                    />
                    <p className="text-sm text-slate-400 mt-3 capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                  </div>
                ))}

              {/* Overall Score */}
              {overallScore > 0 && (
                <div className="md:col-span-6 flex justify-center pt-4 border-t border-slate-800">
                  <div className="flex flex-col items-center">
                    <ScoreRing
                      score={overallScore}
                      maxScore={100}
                      size={160}
                      strokeWidth={12}
                      showLabel={true}
                      animated={true}
                    />
                    <p className="text-lg font-semibold text-slate-300 mt-4">
                      Overall Score
                    </p>
                  </div>
                </div>
              )}
            </div>

            {reasoning && (
              <div className="mt-6 pt-6 border-t border-slate-800">
                <h4 className="text-sm font-semibold text-slate-400 mb-2">
                  Reasoning
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {reasoning}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Videos Section */}
      {product.videos && product.videos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {product.videos.map((video, index) => (
                <div
                  key={video.id || index}
                  className="flex items-center justify-between p-4 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-800 rounded-lg">
                      <FileVideo className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">
                        {video.format || "Default Format"}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <StatusBadge status={video.status as ReviewStatus} />
                        {video.duration && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {video.duration}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {video.videoPath && (
                      <a
                        href={video.videoPath}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="primary" size="sm">
                          <Play className="w-4 h-4 mr-2" />
                          Play
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Created:</span>
              <span className="ml-2 text-slate-200">
                {product.createdAt
                  ? new Date(product.createdAt).toLocaleString()
                  : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Updated:</span>
              <span className="ml-2 text-slate-200">
                {product.updatedAt
                  ? new Date(product.updatedAt).toLocaleString()
                  : "N/A"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
