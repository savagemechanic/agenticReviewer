"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  animated?: boolean;
}

export function ScoreRing({
  score,
  maxScore = 100,
  size = 120,
  strokeWidth = 8,
  className,
  showLabel = true,
  animated = true,
}: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = React.useState(animated ? 0 : score);
  const percentage = (score / maxScore) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / maxScore) * circumference;

  React.useEffect(() => {
    if (!animated) return;

    const duration = 1000;
    const frames = 60;
    const increment = score / frames;
    let currentFrame = 0;

    const timer = setInterval(() => {
      currentFrame++;
      if (currentFrame >= frames) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.min(increment * currentFrame, score));
      }
    }, duration / frames);

    return () => clearInterval(timer);
  }, [score, animated]);

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "text-green-500";
    if (pct >= 60) return "text-blue-500";
    if (pct >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const getStrokeColor = (pct: number) => {
    if (pct >= 80) return "#22c55e";
    if (pct >= 60) return "#3b82f6";
    if (pct >= 40) return "#eab308";
    return "#ef4444";
  };

  const scoreColor = getScoreColor(percentage);
  const strokeColor = getStrokeColor(percentage);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={animated ? "transition-all duration-1000 ease-out" : ""}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold", scoreColor)}>
            {Math.round(animatedScore)}
          </span>
          <span className="text-xs text-slate-400">/ {maxScore}</span>
        </div>
      )}
    </div>
  );
}
