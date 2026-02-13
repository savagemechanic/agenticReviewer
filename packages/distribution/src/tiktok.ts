export interface TikTokConfig {
  accessToken: string;
}

export async function uploadToTikTok(
  config: TikTokConfig,
  video: { buffer: Buffer; title: string; description: string }
): Promise<{ publishId: string }> {
  // TikTok Content Posting API
  // Step 1: Initialize upload
  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_info: { title: video.title, privacy_level: "PUBLIC_TO_EVERYONE" },
      source_info: { source: "FILE_UPLOAD", video_size: video.buffer.length },
    }),
  });
  const initData = (await initRes.json()) as { data: { publish_id: string; upload_url: string } };

  // Step 2: Upload video
  await fetch(initData.data.upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${video.buffer.length - 1}/${video.buffer.length}`,
    },
    body: new Uint8Array(video.buffer),
  });

  return { publishId: initData.data.publish_id };
}
