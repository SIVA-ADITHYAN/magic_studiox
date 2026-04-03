export type GeminiInlineImage = { mimeType: string; data: Uint8Array };

export type GeminiTextResult = { text: string; raw: unknown };
export type GeminiImageResult = { mimeType: string; imageBase64: string; raw: unknown };

export class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiError";
  }
}

function normalizeGeminiModelName(model: string, fallback: string): string {
  const trimmed = (model || "").trim();
  const effective = trimmed || fallback;
  if (!effective) return "models/gemini-3-pro-image-preview";
  if (effective.startsWith("models/") || effective.startsWith("tunedModels/")) return effective;
  return `models/${effective}`;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export async function fileToBytes(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

export async function fileToInlineImage(file: File): Promise<GeminiInlineImage> {
  const bytes = await fileToBytes(file);
  const mimeType = (file.type || "").split(";")[0].trim().toLowerCase() || "application/octet-stream";
  return { mimeType, data: bytes };
}

export function dataUrlToInlineImage(dataUrl: string): GeminiInlineImage {
  const trimmed = (dataUrl || "").trim();
  const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new GeminiError("Invalid data URL (expected base64-encoded image).");
  }
  const mimeType = match[1].trim().toLowerCase() || "application/octet-stream";
  const data = base64ToBytes(match[2]);
  return { mimeType, data };
}

function pickResponseJsonText(result: any): string {
  const parts = (((result?.candidates ?? [])[0]?.content ?? {})?.parts ?? []) as any[];
  const texts: string[] = [];
  for (const part of parts) {
    if (typeof part?.text === "string" && part.text.trim()) texts.push(part.text);
  }
  return texts.join("\n").trim();
}

function pickResponseInlineImage(result: any): { mimeType: string; data: string } | null {
  const parts = (((result?.candidates ?? [])[0]?.content ?? {})?.parts ?? []) as any[];
  for (const part of parts) {
    const inline = part?.inline_data ?? part?.inlineData;
    if (inline?.data) {
      return {
        mimeType: (inline?.mime_type ?? inline?.mimeType ?? "image/png").toString(),
        data: inline.data.toString(),
      };
    }
  }
  return null;
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function generateText(opts: {
  model: string;
  promptText: string;
  images?: GeminiInlineImage[] | null;
  timeoutMs?: number;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<GeminiTextResult> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new GeminiError("Missing API key. Set VITE_GEMINI_API_KEY in your .env file.");

  const modelName = normalizeGeminiModelName(opts.model, "gemini-3-flash-preview");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`;
  const url = `${endpoint}?${new URLSearchParams({ key: apiKey }).toString()}`;

  const parts: any[] = [{ text: opts.promptText }];
  for (const img of opts.images ?? []) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: uint8ArrayToBase64(img.data),
      },
    });
  }

  const payload: any = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: typeof opts.temperature === "number" ? opts.temperature : 0.2,
      ...(typeof opts.maxOutputTokens === "number" ? { maxOutputTokens: opts.maxOutputTokens } : {}),
    },
  };

  const resp = await fetchJsonWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    typeof opts.timeoutMs === "number" ? opts.timeoutMs : 120_000,
  );

  const rawBody = await resp.text();
  if (!resp.ok) {
    throw new GeminiError(`Image API error (${resp.status}): ${rawBody.slice(0, 500)}`);
  }

  let json: any;
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new GeminiError("Image API returned non-JSON response.");
  }

  const text = pickResponseJsonText(json);
  if (!text) throw new GeminiError("Image API did not return text.");
  return { text, raw: json };
}

const PROMPT_QUALITY_MARKER = "Photo quality requirements:";
const PROMPT_PHOTOSHOOT_QUALITY_BLOCK = [
  "Photo quality requirements:",
  "- Output resolution: 1080×1440 pixels (3:4 portrait).",
  "- Photorealistic, high-resolution, ultra-sharp detail, crisp focus (no motion blur).",
  "- Professional high-end fashion/product photoshoot look (studio-grade lighting, clean color, high dynamic range).",
  "- Accurate textures (skin/fabric), natural shadows, realistic perspective and depth.",
  "- Shot on a high-end camera with a premium lens; clean, natural bokeh where applicable.",
  "- Composition: keep the main subject large and fully in frame; avoid extreme wide shots with a tiny subject.",
  "- Color & finish: balanced exposure, medium contrast, gentle highlight roll-off; natural skin tones; no crushed blacks or blown highlights.",
  "- Detail: preserve natural skin texture (no plastic/over-smoothed retouching); enhance fabric micro-contrast so seams/weave/print read clearly.",
  "- Avoid: low-res, blurry, noise, compression artifacts, over-smoothing/plastic look, CGI/cartoon look.",
].join("\n");

function enhanceImagePrompt(promptText: string): string {
  const trimmed = (promptText || "").trim();
  if (!trimmed) return PROMPT_PHOTOSHOOT_QUALITY_BLOCK;
  if (trimmed.includes(PROMPT_QUALITY_MARKER)) return trimmed;
  return `${trimmed}\n\n${PROMPT_PHOTOSHOOT_QUALITY_BLOCK}`;
}

export async function generateImage(opts: {
  model: string;
  promptText: string;
  images: GeminiInlineImage[];
  timeoutMs?: number;
  temperature?: number;
  aspectRatio?: string;
  width?: number;
  height?: number;
}): Promise<GeminiImageResult> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new GeminiError("Missing API key. Set VITE_GEMINI_API_KEY in your .env file.");

  const modelName = normalizeGeminiModelName(opts.model, "gemini-3-pro-image-preview");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`;
  const url = `${endpoint}?${new URLSearchParams({ key: apiKey }).toString()}`;

  const parts: any[] = [{ text: enhanceImagePrompt(opts.promptText) }];
  for (const img of opts.images ?? []) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: uint8ArrayToBase64(img.data),
      },
    });
  }

  const payloadBase: any = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: typeof opts.temperature === "number" ? opts.temperature : 0.2,
      responseModalities: ["IMAGE"],
      ...((opts.aspectRatio || opts.width || opts.height)
        ? {
            imageConfig: {
              ...(opts.aspectRatio ? { aspectRatio: opts.aspectRatio } : {}),
              ...(typeof opts.width === "number" ? { width: Math.round(opts.width) } : {}),
              ...(typeof opts.height === "number" ? { height: Math.round(opts.height) } : {}),
            },
          }
        : {}),
    },
  };

  async function post(payload: any): Promise<any> {
    const resp = await fetchJsonWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      typeof opts.timeoutMs === "number" ? opts.timeoutMs : 180_000,
    );

    const rawBody = await resp.text();
    if (!resp.ok) {
      throw new GeminiError(`Gemini API error (${resp.status}): ${rawBody.slice(0, 500)}`);
    }

    try {
      return JSON.parse(rawBody);
    } catch {
      throw new GeminiError("Gemini API returned non-JSON response.");
    }
  }

  let json: any;
  try {
    json = await post(payloadBase);
  } catch (err: any) {
    const msg = String(err?.message || err);
    const requestedImageConfig = Boolean(opts.aspectRatio || opts.width || opts.height);
    const looksLikeUnknownField =
      requestedImageConfig &&
      (msg.includes("Unknown name") ||
        msg.includes("unknown field") ||
        msg.includes("Invalid JSON payload") ||
        msg.includes("imageConfig") ||
        msg.includes("aspectRatio") ||
        msg.includes("width") ||
        msg.includes("height"));
    if (!looksLikeUnknownField) throw err;

    // Fallback: if the endpoint/model does not support aspect ratio config, retry without it.
    const payloadFallback = {
      ...payloadBase,
      generationConfig: {
        ...payloadBase.generationConfig,
      },
    };
    delete payloadFallback.generationConfig.imageConfig;
    json = await post(payloadFallback);
  }

  const inline = pickResponseInlineImage(json);
  if (!inline) {
    const responseText = pickResponseJsonText(json);
    const detail = (responseText || "").trim();
    throw new GeminiError(
      `Image API did not return an image.${detail ? ` Response text: ${detail.slice(0, 500)}` : ""}`,
    );
  }
  return { mimeType: inline.mimeType, imageBase64: inline.data, raw: json };
}

export function extractJsonObject(text: string): Record<string, unknown> {
  let src = (text || "").trim();
  if (!src) throw new GeminiError("Empty response.");

  if (src.includes("```")) {
    const lines = src.split(/\r?\n/g);
    const chunks: string[] = [];
    let inFence = false;
    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        inFence = !inFence;
        continue;
      }
      if (inFence) chunks.push(line);
    }
    const candidate = chunks.join("\n").trim();
    if (candidate) src = candidate;
  }

  const start = src.indexOf("{");
  const end = src.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new GeminiError("No JSON object found.");
  }
  try {
    return JSON.parse(src.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    throw new GeminiError("Failed to parse JSON.");
  }
}
