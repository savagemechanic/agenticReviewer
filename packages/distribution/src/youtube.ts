import { google } from "googleapis";

export interface YouTubeConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface YouTubeUploadResult {
  videoId: string;
  url: string;
}

export async function uploadToYouTube(
  config: YouTubeConfig,
  video: { buffer: Buffer; title: string; description: string; tags: string[] }
): Promise<YouTubeUploadResult> {
  const oauth2 = new google.auth.OAuth2(config.clientId, config.clientSecret);
  oauth2.setCredentials({ refresh_token: config.refreshToken });

  const youtube = google.youtube({ version: "v3", auth: oauth2 });

  const { Readable } = await import("stream");
  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: video.title,
        description: video.description,
        tags: video.tags,
        categoryId: "28", // Science & Technology
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: Readable.from(video.buffer),
    },
  });

  const videoId = response.data.id!;
  return { videoId, url: `https://youtube.com/watch?v=${videoId}` };
}
