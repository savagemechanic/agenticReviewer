import { renderStill } from "@remotion/renderer";
import { getBundle } from "./bundle.js";
import type { ReviewVideoProps } from "./compositions/ReviewVideo.js";

export async function renderThumbnail(
  props: ReviewVideoProps
): Promise<Buffer> {
  const bundleLocation = await getBundle();

  const isShort = props.format !== "youtube_long";
  const scoreFrame = isShort ? 195 : 360;
  const compositionId = isShort ? "ReviewVideoShort" : "ReviewVideo";
  const width = isShort ? 1080 : 1920;
  const height = isShort ? 1920 : 1080;

  // SAFETY: Remotion expects Record<string, unknown> for props but our concrete
  // ReviewVideoProps interface is structurally compatible at runtime.
  const p = props as unknown as Record<string, unknown>;

  const { buffer } = await renderStill({
    composition: {
      id: compositionId,
      durationInFrames: isShort ? 300 : 570,
      fps: 30,
      width,
      height,
      defaultProps: p,
      props: p,
      defaultCodec: "h264",
    // SAFETY: Remotion's CompositionConfig type doesn't include all fields we pass,
    // but the still renderer accepts this shape at runtime.
    } as Parameters<typeof renderStill>[0]["composition"],
    serveUrl: bundleLocation,
    frame: scoreFrame,
    imageFormat: "png",
    inputProps: p,
    // SAFETY: Remotion's renderStill requires `output` but returns buffer when null is passed
    output: null as unknown as string,
  });

  return Buffer.from(buffer as Uint8Array);
}
