import { NextRequest, NextResponse } from 'next/server';

// NOTE: the annotated allowlist below must stay in sync with
// src/lib/demystify.ts DEMYSTIFY_TOOL_SLUGS (the validation truth — unknown
// slugs coming back from the model are dropped client-side, never rendered).
const SYSTEM_PROMPT = `You are Demystify — the planning engine inside CreatorsKit (creatorskit.win), a browser-only suite of creator tools.
The user gives you a goal, a skill, a concept, or a big task they keep avoiding. Turn it into a numbered plan of small, doable chunks — demystify it.

RULES:
- Respond with ONLY raw JSON. No markdown fences, no commentary.
- Schema: {"title": string, "summary": string (max 2 sentences), "steps": [{"title": string (max 10 words, imperative), "detail": string (1-3 concrete sentences with specific formats, sizes, counts or platforms), "tools": string[]}]}
- Return 5 to 9 steps, ordered from first action to finished result.
- If the task feels big or the user is procrastinating, the first steps must SHRINK it: a 10-minute starter version, one tiny concrete action that makes the big thing feel small. Never shame the user — make starting easy.
- The user may not know CreatorsKit at all. When a step can genuinely be done by one of our free tools, attach its slug; otherwise leave "tools" empty. Max 2 per step, this exact allowlist only:
teleprompter (write & rehearse a script), auto-captions (subtitle a video), text-highlighter (animated text videos), match-cut (kinetic typography cuts), thumbnail-lab (thumbnail A/B testing), resizer (format media per platform), watermark (protect images), compressor (convert & compress files), carousel-slicer (slice carousels), background-replace (cut out subjects), text-behind (text-behind-image posters), quote-card (quote graphics), palette-extractor (pull brand colors), color-gradient (build gradients), sync-slate (log & sync takes), bouquet (digital gift bouquets), business (invoices, receipts, agreements), video-grabber (save reference footage).
- Be concrete and practical. No generic advice, no motivational filler.`;

// ── Friendly error translation ──────────────────────────────────────────────
// Owner ruling (2026-10-03): users must NEVER see raw provider JSON. Every
// provider failure is parsed here and translated into one clean, actionable
// sentence — even rendered in red, it explains what to DO next (which model
// to pick instead, where the key lives, when to retry). Raw detail only
// ever reaches the server console, never the response body.
function friendlyProviderError(providerLabel: string, model: string, status: number, errText: string): string {
    let detail = '';
    try {
        const parsed = JSON.parse(errText);
        const raw = parsed?.error?.message ?? parsed?.message ?? parsed?.error ?? '';
        detail = typeof raw === 'string' ? raw.trim() : '';
    } catch {
        detail = (errText || '').trim().slice(0, 300);
    }
    const lower = detail.toLowerCase();

    // Model retired / unavailable — the provider names its replacement
    // ("...use models/gemini-3.1-pro-preview"). Echo that suggestion back.
    const retired =
        status === 404 ||
        lower.includes('no longer available') ||
        lower.includes('not found') ||
        lower.includes('does not exist') ||
        lower.includes('decommissioned') ||
        lower.includes('retired') ||
        lower.includes('unsupported');
    if (retired) {
        const suggested = detail.match(/models\/[a-z0-9.\-]+/i)?.[0] || '';
        const swap = suggested
            ? `The provider suggests ${suggested} instead — tap FETCH MODELS in AI SETTINGS and pick it.`
            : 'Tap FETCH MODELS in AI SETTINGS and pick a current model, or switch back to AUTO.';
        return `That model (${model}) is no longer available. ${swap}`;
    }

    if (status === 503 || lower.includes('high demand') || lower.includes('overloaded') || lower.includes('capacity')) {
        return `${providerLabel} is busy right now — ${model} is in high demand. Give it a moment and try again, or pick a different model in AI SETTINGS.`;
    }

    if (status === 429) {
        return `You hit ${providerLabel}'s free rate limit. Wait about a minute and try again, or switch provider in AI SETTINGS (Groq keys are free).`;
    }

    if (status === 401 || status === 403 || lower.includes('api key') || lower.includes('api_key') || lower.includes('unauthorized') || lower.includes('permission')) {
        return `Your ${providerLabel} key was rejected. Re-copy it from start to end and paste it again in AI SETTINGS below.`;
    }

    if (status === 400 && (lower.includes('context length') || lower.includes('too large') || lower.includes('max tokens'))) {
        return 'That idea is too long for this model. Shorten it a little and try again.';
    }

    return `${providerLabel} couldn't finish the request. Try again, or switch provider / model in AI SETTINGS.`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const provider = (body?.provider as string) || 'groq';
        const userApiKey = (body?.apiKey as string) || '';
        const idea = (body?.idea as string) || '';
        const modelOverride = ((body?.model as string) || '').trim();

        if (!idea.trim()) {
            return NextResponse.json({ error: 'Describe your idea first — even one rough sentence works.' }, { status: 400 });
        }

        const trimmedIdea = idea.trim().slice(0, 4000);
        let resolvedKey = userApiKey.trim();
        let model = '';
        let content = '';

        if (provider === 'groq') {
            if (!resolvedKey) resolvedKey = (process.env.GROQ_API_KEY || '').trim();
            if (!resolvedKey) {
                return NextResponse.json(
                    { error: 'No Groq API key. Grab a free one at console.groq.com/keys and paste it in AI SETTINGS.' },
                    { status: 401 }
                );
            }

            model = modelOverride || 'llama-3.3-70b-versatile';
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${resolvedKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: trimmedIdea },
                    ],
                    temperature: 0.4,
                    max_tokens: 1800,
                    response_format: { type: 'json_object' },
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                return NextResponse.json({ error: friendlyProviderError('Groq', model, response.status, errText) }, { status: response.status });
            }

            const data = await response.json();
            content = data.choices?.[0]?.message?.content || '';
        } else if (provider === 'openai') {
            if (!resolvedKey) resolvedKey = (process.env.OPENAI_API_KEY || '').trim();
            if (!resolvedKey) {
                return NextResponse.json(
                    { error: 'No OpenAI API key. Paste your key in AI SETTINGS, or use the free Groq option.' },
                    { status: 401 }
                );
            }

            model = modelOverride || 'gpt-4o-mini';
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${resolvedKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: trimmedIdea },
                    ],
                    temperature: 0.4,
                    max_tokens: 1800,
                    response_format: { type: 'json_object' },
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                return NextResponse.json({ error: friendlyProviderError('OpenAI', model, response.status, errText) }, { status: response.status });
            }

            const data = await response.json();
            content = data.choices?.[0]?.message?.content || '';
        } else if (provider === 'gemini') {
            const geminiKey = (resolvedKey || process.env.GEMINI_API_KEY || '').trim();
            if (!geminiKey) {
                return NextResponse.json(
                    { error: 'No Gemini API key. Grab one free at aistudio.google.com/apikey and paste it in AI SETTINGS.' },
                    { status: 401 }
                );
            }

            model = modelOverride || 'gemini-3.8-flash';
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                        contents: [{ role: 'user', parts: [{ text: trimmedIdea }] }],
                        generationConfig: {
                            temperature: 0.4,
                            maxOutputTokens: 2048,
                            responseMimeType: 'application/json',
                        },
                    }),
                }
            );

            if (!response.ok) {
                const errText = await response.text();
                return NextResponse.json({ error: friendlyProviderError('Gemini', model, response.status, errText) }, { status: response.status });
            }

            const data = await response.json();
            content = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('');
        } else {
            return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
        }

        if (!content.trim()) {
            return NextResponse.json({ error: 'The AI returned an empty response. Try again.' }, { status: 502 });
        }

        // Defensive parse — some models wrap JSON in fences despite instructions
        // (same cleanup as the captions Gemini path).
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        let plan: unknown = null;
        try {
            plan = JSON.parse(cleaned);
        } catch {
            plan = null;
        }
        if (!plan) {
            return NextResponse.json({ error: 'The AI returned malformed JSON. Try again or switch provider.' }, { status: 502 });
        }

        return NextResponse.json({ provider, model, plan });
    } catch (err: any) {
        // Raw detail stays in the server console; the user gets guidance.
        console.error('Demystify API error:', err);
        return NextResponse.json({ error: "Couldn't reach your AI provider. Check your connection and try again." }, { status: 502 });
    }
}
