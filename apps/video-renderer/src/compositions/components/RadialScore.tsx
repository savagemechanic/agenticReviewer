import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface RadialScoreProps {
  score: number;
  label: string;
  size?: number;
  color?: string;
  delay?: number;
}

export const RadialScore: React.FC<RadialScoreProps> = ({
  score,
  label,
  size = 120,
  color = "#facc15",
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 80 },
  });

  const animatedScore = interpolate(progress, [0, 1], [0, score]);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - (animatedScore / 10));
  const center = size / 2;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={8}
        />
        {/* Score ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
        {/* Score text */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={size * 0.3}
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          {animatedScore.toFixed(1)}
        </text>
      </svg>
      <span
        style={{
          color: "#94a3b8",
          fontSize: 14,
          fontFamily: "sans-serif",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
};
