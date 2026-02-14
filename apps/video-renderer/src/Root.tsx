import React from "react";
import { Composition } from "remotion";
import { ReviewVideo, type ReviewVideoProps } from "./compositions/ReviewVideo.js";

const longDefaults: ReviewVideoProps = {
  productName: "Example Product",
  summary: "An example product review.",
  keyFeatures: ["Feature 1", "Feature 2", "Feature 3"],
  pros: ["Easy to use", "Great support"],
  cons: ["Expensive", "Limited integrations"],
  overallScore: 7.5,
  uxScore: 8.0,
  performanceScore: 7.0,
  featureScore: 8.0,
  valueScore: 7.0,
  format: "youtube_long",
};

const shortDefaults: ReviewVideoProps = {
  ...longDefaults,
  keyFeatures: ["Feature 1", "Feature 2"],
  pros: ["Easy to use"],
  cons: ["Expensive"],
  format: "tiktok_short",
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReviewVideo"
        // SAFETY: Remotion's Composition component types its `component` prop as React.LazyExoticComponent | React.FC,
        // but ReviewVideo's props don't extend Record<string, unknown> which Remotion expects at the type level.
        // The runtime behavior is correct — Remotion passes props through to the component.
        component={ReviewVideo as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={570}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={longDefaults as unknown as Record<string, unknown>}
      />
      <Composition
        id="ReviewVideoShort"
        // SAFETY: Same Remotion type mismatch as above — component props are correctly passed at runtime.
        component={ReviewVideo as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={shortDefaults as unknown as Record<string, unknown>}
      />
    </>
  );
};
