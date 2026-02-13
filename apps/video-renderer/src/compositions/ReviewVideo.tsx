import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";

interface ReviewVideoProps {
  productName: string;
  summary: string;
  overallScore: number;
  screenshotUrl?: string;
  pros: string[];
  cons: string[];
}

const Intro: React.FC<{ productName: string }> = ({ productName }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ color: "white", fontSize: 72, opacity, fontFamily: "sans-serif" }}>
        {productName}
      </h1>
      <p style={{ color: "#94a3b8", fontSize: 28, opacity, fontFamily: "sans-serif" }}>
        Honest AI Review
      </p>
    </AbsoluteFill>
  );
};

const ScoreCard: React.FC<{ score: number }> = ({ score }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
        <div style={{ color: "#facc15", fontSize: 120, fontWeight: "bold", fontFamily: "sans-serif" }}>
          {score.toFixed(1)}
        </div>
        <div style={{ color: "#94a3b8", fontSize: 32, fontFamily: "sans-serif" }}>/ 10</div>
      </div>
    </AbsoluteFill>
  );
};

const SummarySlide: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", padding: 60, justifyContent: "center" }}>
      <p style={{ color: "white", fontSize: 28, lineHeight: 1.6, opacity, fontFamily: "sans-serif" }}>
        {text}
      </p>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center" }}>
      <h2 style={{ color: "white", fontSize: 48, opacity, fontFamily: "sans-serif" }}>
        Like & Subscribe for more reviews
      </h2>
    </AbsoluteFill>
  );
};

export const ReviewVideo: React.FC<ReviewVideoProps> = ({
  productName,
  summary,
  overallScore,
}) => {
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={90}>
        <Intro productName={productName} />
      </Sequence>
      <Sequence from={90} durationInFrames={150}>
        <SummarySlide text={summary} />
      </Sequence>
      <Sequence from={240} durationInFrames={90}>
        <ScoreCard score={overallScore} />
      </Sequence>
      <Sequence from={330} durationInFrames={90}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
