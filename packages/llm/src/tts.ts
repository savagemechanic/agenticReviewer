import { createLogger } from "@repo/shared";

const logger = createLogger("llm:tts");

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

export interface TTSOptions {
  text: string;
  voiceId?: string;
}

export async function generateNarration(options: TTSOptions): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const voiceId = options.voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: options.text,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    logger.warn("ElevenLabs TTS failed", { status: response.status });
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
