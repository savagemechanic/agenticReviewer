"use client";

import { useState } from "react";
import { Check, X, Play, FileVideo, Clock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useVideos } from "@/hooks/useVideos";
import { useActions } from "@/hooks/useActions";

export default function VideosPage() {
  const { data: videos, isLoading, refetch } = useVideos();
  const { approveVideo, rejectVideo } = useActions();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (videoId: string) => {
    try {
      await approveVideo.mutateAsync(videoId);
      refetch();
    } catch (error) {
      console.error("Failed to approve video:", error);
    }
  };

  const handleRejectClick = (videoId: string) => {
    setSelectedVideoId(videoId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedVideoId) return;

    try {
      await rejectVideo.mutateAsync({
        videoId: selectedVideoId,
        reason: rejectReason,
      });
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedVideoId(null);
      refetch();
    } catch (error) {
      console.error("Failed to reject video:", error);
    }
  };

  const renderedVideos = videos?.filter(
    (v) => v.status === "rendered" || v.status === "approved"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Video Review Queue</h1>
        <p className="text-slate-400 mt-1">
          Review and approve videos for distribution
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-400">Loading videos...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && (!renderedVideos || renderedVideos.length === 0) && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center">
              <div className="p-4 bg-slate-800 rounded-full mb-4">
                <FileVideo className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-400 text-lg">No videos ready for review</p>
              <p className="text-slate-500 text-sm mt-2">
                Videos will appear here once they are rendered and ready for approval
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Videos Grid */}
      {!isLoading && renderedVideos && renderedVideos.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderedVideos.map((video) => (
            <Card key={video.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Product ID: {video.productId}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={video.status as any} />
                      {video.videoPath && (
                        <Badge variant="outline">Ready</Badge>
                      )}
                    </div>
                  </div>
                  {video.scriptPath && (
                    <a
                      href={video.scriptPath}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm">
                        View Script
                      </Button>
                    </a>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Video Player */}
                {video.videoPath ? (
                  <div className="aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                    <video
                      src={video.videoPath}
                      controls
                      className="w-full h-full"
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center">
                    <div className="text-center">
                      <FileVideo className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Video not available</p>
                    </div>
                  </div>
                )}

                {/* Video Info */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-slate-400">
                    <span className="flex items-center gap-1">
                      <Play className="w-4 h-4" />
                      Format: Default
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(video.createdAt || "").toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  <Button
                    variant="primary"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(video.id)}
                    disabled={approveVideo.isPending}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => handleRejectClick(video.id)}
                    disabled={rejectVideo.isPending}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Video</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this video. This will help
              improve future video generation.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              label="Rejection Reason"
              placeholder="e.g., Poor quality, incorrect information, etc."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason("");
                setSelectedVideoId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
