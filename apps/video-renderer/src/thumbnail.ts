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
    } as any,
    serveUrl: bundleLocation,
    frame: scoreFrame,
    imageFormat: "png",
    inputProps: p,
    output: null as unknown as string,
  });

  return Buffer.from(buffer as Uint8Array);
}
