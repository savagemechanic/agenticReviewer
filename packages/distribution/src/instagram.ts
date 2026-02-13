export interface InstagramConfig {
  accessToken: string;
  businessAccountId: string;
}

export async function uploadToInstagram(
  config: InstagramConfig,
  video: { url: string; caption: string }
): Promise<{ mediaId: string }> {
  // Step 1: Create media container
  const createRes = await fetch(
    `https://graph.facebook.com/v21.0/${config.businessAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: video.url,
        caption: video.caption,
        access_token: config.accessToken,
      }),
    }
  );
  const createData = (await createRes.json()) as { id: string };

  // Step 2: Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${config.businessAccountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: config.accessToken,
      }),
    }
  );
  const publishData = (await publishRes.json()) as { id: string };

  return { mediaId: publishData.id };
}
