import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface AnimatedBulletProps {
  text: string;
  index: number;
  icon?: string;
  color?: string;
}

export const AnimatedBullet: React.FC<AnimatedBulletProps> = ({
  text,
  index,
  icon = "•",
  color = "#e2e8f0",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delay = index * 8;
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const translateX = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  const x = interpolate(translateX, [0, 1], [40, 0]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity,
        transform: `translateX(${x}px)`,
        marginBottom: 12,
      }}
    >
      <span style={{ color, fontSize: 20, flexShrink: 0 }}>{icon}</span>
      <span style={{ color, fontSize: 22, fontFamily: "sans-serif", lineHeight: 1.4 }}>
        {text}
      </span>
    </div>
  );
};
