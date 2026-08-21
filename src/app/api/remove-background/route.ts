import { NextRequest } from "next/server";

export const maxDuration = 90;

// Background removal proxy. Uses the Hugging Face serverless tier (Unified
// Inference API — the legacy api-inference.huggingface.co endpoint is retired).
// NOTE: RMBG models are not currently served on the FREE tier — the pages call
// this first and automatically fall back to fully local @imgly background
// removal in the browser when the models are unavailable.

// Models are tried in order until one responds successfully.
// Override with HF_BACKGROUND_MODEL (single) or HF_BACKGROUND_MODELS (comma list).
const MODELS = [
  ...(process.env.HF_BACKGROUND_MODEL ? [process.env.HF_BACKGROUND_MODEL] : []),
  ...(process.env.HF_BACKGROUND_MODELS
    ? process.env.HF_BACKGROUND_MODELS.split(",").map((m) => m.trim()).filter(Boolean)
    : []),
];
const FALLBACK_MODELS = ["briaai/RMBG-1.4", "briaai/RMBG-2.0"];

const MODEL_ORDER = [...new Set([...MODELS, ...FALLBACK_MODELS])];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchHf(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    last = await fetch(url, init);
    if (last.ok || last.status !== 503) return last; // 503 = model still loading
    await sleep(Math.min(2500 * (i + 1), 6000));
  }
  return last ?? new Response(null, { status: 502 });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error: {
          message:
            "HUGGINGFACE_API_KEY is not set. Copy .env.example to .env.local and add your token (https://huggingface.co/settings/tokens), then restart the dev server.",
        },
      },
      { status: 500 }
    );
  }

  let image: string;
  try {
    const body = await request.json();
    image = body?.image;
  } catch {
    return Response.json({ error: { message: "Invalid request body." } }, { status: 400 });
  }

  if (typeof image !== "string" || !image) {
    return Response.json({ error: { message: "Missing image data." } }, { status: 400 });
  }

  const base64 = image.includes(",") ? image.split(",")[1] : image;
  const bytes = Buffer.from(base64, "base64");

  let lastUnsupported = false;

  for (const model of MODEL_ORDER) {
    let hfRes: Response;
    try {
      hfRes = await fetchHf(
        `https://router.huggingface.co/hf-inference/models/${model}?options=wait_for_model`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "image/png",
          },
          body: bytes,
          cache: "no-store",
          signal: AbortSignal.timeout(85_000),
        }
      );
    } catch (err) {
      return Response.json(
        {
          error: {
            message: `Could not reach Hugging Face: ${err instanceof Error ? err.message : "unknown error"}`,
          },
        },
        { status: 502 }
      );
    }

    if (hfRes.ok) {
      const buffer = await hfRes.arrayBuffer();
      return new Response(buffer, {
        headers: {
          "Content-Type": hfRes.headers.get("content-type") ?? "image/png",
          "Cache-Control": "no-store",
        },
      });
    }

    const text = await hfRes.text().catch(() => "");
    if (!text.includes("not supported by provider")) {
      return Response.json(
        {
          error: {
            message: text.includes("in-browser")
              ? text
              : `Hugging Face returned HTTP ${hfRes.status} (${model}): ${text.slice(0, 300)}`,
          },
        },
        { status: 502 }
      );
    }
    lastUnsupported = true;
  }

  if (lastUnsupported) {
    return Response.json(
      {
        error: {
          message:
            "None of the background models are free on Hugging Face, so we're switching to in-browser removal.",
        },
      },
      { status: 502 }
    );
  }

  return Response.json({ error: { message: "No background removal model available." } }, { status: 502 });
}