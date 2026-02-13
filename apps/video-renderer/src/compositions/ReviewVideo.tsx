import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from "remotion";
import { RadialScore } from "./components/RadialScore.js";
import { AnimatedBullet } from "./components/AnimatedBullet.js";

export interface ReviewVideoProps {
  productName: string;
  summary: string;
  keyFeatures: string[];
  pros: string[];
  cons: string[];
  overallScore: number;
  uxScore: number;
  performanceScore: number;
  featureScore: number;
  valueScore: number;
  screenshotUrl?: string;
  format?: "youtube_long" | "tiktok_short" | "instagram_reel";
}

const BG = "#0f172a";
const BG_GRADIENT = "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)";

const Intro: React.FC<{ productName: string }> = ({ productName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleSpring = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const subtitleOpacity = interpolate(frame, [20, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtitleY = interpolate(frame, [20, 45], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const gradientAngle = interpolate(frame, [0, 90], [135, 200]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h1
        style={{
          color: "white",
          fontSize: 72,
          fontFamily: "sans-serif",
          fontWeight: 800,
          transform: `scale(${scaleSpring})`,
          textAlign: "center",
          padding: "0 60px",
        }}
      >
        {productName}
      </h1>
      <p
        style={{
          color: "#a78bfa",
          fontSize: 28,
          fontFamily: "sans-serif",
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          marginTop: 16,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        AI-Powered Review
      </p>
    </AbsoluteFill>
  );
};

const ScreenshotSlide: React.FC<{ screenshotUrl?: string; productName: string }> = ({
  screenshotUrl,
  productName,
}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 120], [1, 1.15], { extrapolateRight: "clamp" });
  const x = interpolate(frame, [0, 120], [0, -30], { extrapolateRight: "clamp" });
  const captionOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {screenshotUrl ? (
        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
          <Img
            src={screenshotUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${scale}) translateX(${x}px)`,
            }}
          />
        </div>
      ) : (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <p style={{ color: "#475569", fontSize: 32, fontFamily: "sans-serif" }}>
            Screenshot unavailable
          </p>
        </AbsoluteFill>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "40px 60px",
          background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
          opacity: captionOpacity,
        }}
      >
        <p style={{ color: "white", fontSize: 28, fontFamily: "sans-serif", fontWeight: 600 }}>
          {productName} — Homepage
        </p>
      </div>
    </AbsoluteFill>
  );
};

const SummarySlide: React.FC<{
  keyFeatures: string[];
  pros: string[];
  cons: string[];
}> = ({ keyFeatures, pros, cons }) => {
  const frame = useCurrentFrame();
  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, padding: 60 }}>
      <div style={{ opacity: headerOpacity, marginBottom: 24 }}>
        <h2 style={{ color: "#a78bfa", fontSize: 32, fontFamily: "sans-serif", fontWeight: 700, marginBottom: 16 }}>
          Key Features
        </h2>
      </div>
      <div style={{ marginBottom: 32 }}>
        {keyFeatures.slice(0, 5).map((f, i) => (
          <AnimatedBullet key={i} text={f} index={i} icon="✦" color="#e2e8f0" />
        ))}
      </div>
      <div style={{ display: "flex", gap: 60, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: "#4ade80", fontSize: 24, fontFamily: "sans-serif", marginBottom: 12 }}>Pros</h3>
          {pros.slice(0, 4).map((p, i) => (
            <AnimatedBullet key={i} text={p} index={i + keyFeatures.length} icon="✓" color="#4ade80" />
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: "#f87171", fontSize: 24, fontFamily: "sans-serif", marginBottom: 12 }}>Cons</h3>
          {cons.slice(0, 4).map((con, i) => (
            <AnimatedBullet key={i} text={con} index={i + keyFeatures.length + pros.length} icon="✗" color="#f87171" />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ScoreCard: React.FC<{
  overall: number;
  ux: number;
  performance: number;
  features: number;
  value: number;
}> = ({ overall, ux, performance, features, value }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const overallSpring = spring({ frame, fps, config: { damping: 20, stiffness: 60 } });
  const displayScore = interpolate(overallSpring, [0, 1], [0, overall]);
  const scoreColor = overall >= 7 ? "#4ade80" : overall >= 5 ? "#facc15" : "#f87171";

  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ color: scoreColor, fontSize: 140, fontWeight: 900, fontFamily: "sans-serif", lineHeight: 1 }}>
          {displayScore.toFixed(1)}
        </div>
        <div style={{ color: "#64748b", fontSize: 28, fontFamily: "sans-serif" }}>/ 10 Overall</div>
      </div>
      <div style={{ display: "flex", gap: 40 }}>
        <RadialScore score={ux} label="UX" delay={10} color="#818cf8" />
        <RadialScore score={performance} label="Speed" delay={20} color="#34d399" />
        <RadialScore score={features} label="Features" delay={30} color="#facc15" />
        <RadialScore score={value} label="Value" delay={40} color="#fb923c" />
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 30], [0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BG_GRADIENT, justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", opacity, transform: `scale(${scale})` }}>
        <h2 style={{ color: "white", fontSize: 52, fontFamily: "sans-serif", fontWeight: 800 }}>
          Like & Subscribe
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 24, fontFamily: "sans-serif", marginTop: 16 }}>
          for more AI-powered software reviews
        </p>
        <p style={{ color: "#a78bfa", fontSize: 20, fontFamily: "sans-serif", marginTop: 32 }}>
          Powered by Agentic Reviewer
        </p>
      </div>
    </AbsoluteFill>
  );
};

export const ReviewVideo: React.FC<ReviewVideoProps> = ({
  productName,
  summary,
  keyFeatures = [],
  pros = [],
  cons = [],
  overallScore,
  uxScore,
  performanceScore,
  featureScore,
  valueScore,
  screenshotUrl,
  format = "youtube_long",
}) => {
  const isShort = format !== "youtube_long";
  const intro = isShort ? 45 : 90;
  const screenshot = isShort ? 60 : 120;
  const summaryDur = isShort ? 90 : 150;
  const scoreDur = isShort ? 60 : 120;
  const outro = isShort ? 45 : 90;

  let offset = 0;

  return (
    <AbsoluteFill>
      <Sequence durationInFrames={intro}>
        <Intro productName={productName} />
      </Sequence>
      <Sequence from={(offset += intro)} durationInFrames={screenshot}>
        <ScreenshotSlide screenshotUrl={screenshotUrl} productName={productName} />
      </Sequence>
      <Sequence from={(offset += screenshot)} durationInFrames={summaryDur}>
        <SummarySlide keyFeatures={keyFeatures} pros={pros} cons={cons} />
      </Sequence>
      <Sequence from={(offset += summaryDur)} durationInFrames={scoreDur}>
        <ScoreCard overall={overallScore} ux={uxScore} performance={performanceScore} features={featureScore} value={valueScore} />
      </Sequence>
      <Sequence from={(offset += scoreDur)} durationInFrames={outro}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
