import { NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 300;

// Whisper transcription through the free Hugging Face serverless tier (Unified
// Inference API — the legacy api-inference.huggingface.co endpoint is retired).
// POST: { audio: base64-encoded 16kHz mono WAV }  →  { text, chunks }

const HF_MODEL = process.env.HF_TRANSCRIBE_MODEL ?? "openai/whisper-large-v3-turbo";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchHf(url: string, init: RequestInit, attempts = 4): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    last = await fetch(url, init);
    if (last.ok || last.status !== 503) return last; // 503 = model still loading
    await sleep(Math.min(2500 * (i + 1), 8000));
  }
  return last ?? new Response(null, { status: 502 });
}

export async function POST(req: Request) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "HUGGINGFACE_API_KEY is not configured. Copy .env.example to .env.local and paste your free token from https://huggingface.co/settings/tokens",
      },
      { status: 500 }
    );
  }

  let body: { audio?: string; wordLevel?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.audio || typeof body.audio !== "string") {
    return NextResponse.json({ error: "Missing audio payload." }, { status: 400 });
  }

  const audioRaw = Buffer.from(body.audio, "base64");
  const timestamps = body.wordLevel ? "word" : "true";

  try {
    const hf = await fetchHf(
      `https://router.huggingface.co/hf-inference/models/${HF_MODEL}?return_timestamps=${timestamps}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "audio/wav",
        },
        body: audioRaw,
        signal: AbortSignal.timeout(280_000),
      }
    );

    if (!hf.ok) {
      const detail = await hf.text().catch(() => "");
      return NextResponse.json(
        { error: `Hugging Face returned ${hf.status}: ${detail.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const data = await hf.json();
    const chunks = Array.isArray(data?.chunks)
      ? data.chunks
          .map((c: { timestamp?: [number, number]; text?: string }) => ({
            start: c.timestamp?.[0] ?? 0,
            end: c.timestamp?.[1] ?? 0,
            text: (c.text ?? "").trim(),
          }))
          .filter((c: { text: string }) => c.text.length > 0)
      : [];

    return NextResponse.json({ text: (data?.text ?? "").trim(), chunks });
  } catch (err) {
    return NextResponse.json(
      { error: `Transcription failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 500 }
    );
  }
}