import { Blob } from "node:buffer";

function normalizeMimeType(mimeType) {
  const value = String(mimeType || "").toLowerCase().trim();

  if (value.startsWith("audio/webm")) return "audio/webm";
  if (value.startsWith("video/webm")) return "video/webm";
  if (value.startsWith("audio/ogg")) return "audio/ogg";
  if (value.startsWith("audio/wav") || value.startsWith("audio/x-wav")) return "audio/wav";
  if (value.startsWith("audio/mpeg") || value.startsWith("audio/mp3")) return "audio/mpeg";
  if (value.startsWith("audio/mp4") || value.startsWith("audio/x-m4a")) return "audio/mp4";
  if (value.startsWith("audio/aac") || value.startsWith("audio/x-aac")) return "audio/aac";
  if (value.startsWith("audio/flac") || value.startsWith("audio/x-flac")) return "audio/flac";
  if (value.startsWith("audio/opus")) return "audio/opus";

  return "audio/webm";
}

function mimeToExtension(mimeType) {
  const lookup = {
    "audio/webm": "webm",
    "video/webm": "webm",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/flac": "flac",
    "audio/opus": "opus"
  };

  return lookup[mimeType] || "webm";
}

export class SarvamSpeechService {
  constructor(options) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || "https://api.sarvam.ai").replace(/\/$/, "");
    this.model = options.model || "saaras:v3";
    this.languageCode = options.languageCode || "unknown";
    this.mode = options.mode || "transcribe";
    this.withTimestamps = options.withTimestamps ?? false;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async transcribeAudio({
    audioBuffer,
    mimeType = "audio/webm",
    languageCode,
    mode,
    withTimestamps
  }) {
    if (!this.isConfigured()) {
      throw new Error(
        "Sarvam API key is missing. Add SARVAM_API_KEY in your .env file to enable speech transcription."
      );
    }

    const normalizedMimeType = normalizeMimeType(mimeType);
    const selectedLanguage = languageCode || this.languageCode || "unknown";
    const selectedMode = mode || this.mode || "transcribe";
    const wantsTimestamps =
      typeof withTimestamps === "boolean" ? withTimestamps : this.withTimestamps;

    const payload = new FormData();

    payload.append(
      "file",
      new Blob([audioBuffer], { type: normalizedMimeType }),
      `complaint-audio.${mimeToExtension(normalizedMimeType)}`
    );

    payload.append("model", this.model);
    payload.append("language_code", selectedLanguage);
    payload.append("mode", selectedMode);
    payload.append("with_timestamps", String(Boolean(wantsTimestamps)));

    const response = await fetch(`${this.baseUrl}/speech-to-text`, {
      method: "POST",
      headers: {
        "api-subscription-key": this.apiKey
      },
      body: payload
    });

    const isJson = response.headers
      .get("content-type")
      ?.includes("application/json");

    const body = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        body?.error?.message ||
        body?.message ||
        (typeof body === "string" ? body : "Sarvam transcription failed.");

      throw new Error(message);
    }

    return {
      requestId: body.request_id || null,
      transcript: body.transcript || "",
      languageCode: body.language_code || selectedLanguage || null,
      languageProbability: body.language_probability ?? null,
      timestamps: body.timestamps || null,
      mode: selectedMode
    };
  }
}