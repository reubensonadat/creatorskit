import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function friendlyProviderError(providerLabel: string, model: string, status: number, errText: string): string {
    let detail = '';
    try {
        const parsed = JSON.parse(errText);
        detail = parsed?.error?.message ?? parsed?.message ?? parsed?.error ?? '';
    } catch {
        detail = (errText || '').trim().slice(0, 300);
    }
    const lower = detail.toLowerCase();

    const retired =
        status === 404 ||
        lower.includes('no longer available') ||
        lower.includes('not found') ||
        lower.includes('does not exist') ||
        lower.includes('decommissioned') ||
        lower.includes('retired') ||
        lower.includes('unsupported');
    if (retired) {
        return `Model (${model}) is no longer available. Pick a current model in AI Settings (e.g. gemini-2.5-flash or llama-3.3-70b-versatile).`;
    }

    if (status === 503 || lower.includes('high demand') || lower.includes('overloaded') || lower.includes('capacity')) {
        return `${providerLabel} is busy right now (${model} is under high demand). Wait a moment and try again.`;
    }

    if (status === 429) {
        return `You hit ${providerLabel}'s free rate limit. Wait a minute and try again, or switch provider in AI Settings.`;
    }

    if (status === 401 || status === 403 || lower.includes('api key') || lower.includes('api_key') || lower.includes('unauthorized')) {
        return `Invalid or expired ${providerLabel} API key. Please check your key in AI Settings.`;
    }

    return `${providerLabel} error: ${detail || `HTTP ${status}`}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
        const docType = body.docType || 'invoice';
        const provider = (body.provider || 'gemini') as 'gemini' | 'openai' | 'groq';
        const modelOverride = typeof body.model === 'string' ? body.model.trim() : '';
        const userApiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';

        if (!prompt) {
            return NextResponse.json({ error: 'Please enter a description or deal details.' }, { status: 400 });
        }

        const today = new Date();
        const todayISO = today.toISOString().split('T')[0];
        const defaultDue = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const SYSTEM_PROMPT = `You are the AI Business Engine inside CreatorsKit (creatorskit.win), a browser-based creative & business suite for independent creators, agencies, and freelancers.
Your job is to transform the user's natural language description, deal brief, bullet points, or casual message into a complete, structured, ready-to-bill business document.

Today's date is: ${todayISO}.

RULES:
- Respond with ONLY raw JSON. No markdown backticks, no comments, no introductory or trailing text.
- Match this exact JSON schema:
{
  "docType": "invoice" | "receipt" | "agreement" | "letterhead",
  "clientName": string,
  "clientEmail": string,
  "clientAddress": string,
  "currency": "USD" | "GHS" | "NGN" | "GBP" | "EUR",
  "invoiceNumber": string,
  "issueDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "depositPercentage": number,
  "notes": string,
  "items": [
    {
      "id": string,
      "description": string,
      "quantity": number,
      "rate": number,
      "platform": "TikTok" | "Instagram" | "YouTube" | "Podcast" | "UGC" | "Event" | "Other"
    }
  ],
  "contractTitle": string,
  "contractScope": string,
  "contractCustomTerms": string,
  "contractGoverningLaw": string,
  "contractTemplate": "service" | "business" | "creator",
  "letterheadTitle": string,
  "letterheadIntro": string,
  "receiptNumber": string,
  "amountPaid": number
}

GUIDELINES FOR INFERRED DATA:
1. Target Document: If user didn't specify, default docType to "${docType}".
2. Currency: Default to "USD", unless the user mentions GHS / Cedis, NGN / Naira, GBP / Pounds, or EUR / Euros.
3. Client: Extract client / brand company name cleanly. If email or address is provided, include it, else leave empty string.
4. Dates:
   - issueDate: default to "${todayISO}"
   - dueDate: if user says "due in 7 days", "Net 30", "due next month", etc., calculate the exact YYYY-MM-DD date. Default to "${defaultDue}".
5. Deliverables & Items:
   - Break down services into clean, professional line items (e.g. "2x 60s Dedicated TikTok Video", "1x Instagram Carousel Post", "Full Website Redesign & Mobile Wireframes").
   - Ensure quantity is an integer >= 1.
   - If user provides a total package price (e.g. "$4,000 for 2 TikToks and 1 Reel"), distribute realistic rates so (quantity * rate) adds up accurately to the total.
   - Assign appropriate platform ("TikTok", "Instagram", "YouTube", "Podcast", "UGC", "Event", or "Other").
6. Invoice Number: Generate a clean invoice number like "INV-2026-001" or match whatever the user mentions.
7. Deposit & Terms: If 50% deposit or upfront is mentioned, set depositPercentage to 50. In "notes", write polite payment terms, bank/transfer reference, or thank-you note.
8. Contracts & Agreements: If docType is agreement or contract, provide a comprehensive contractTitle, a solid contractScope summary, and protective terms (usage rights period, revision rounds, kill fee).
9. Keep output strictly valid JSON.`;

        let resolvedKey = userApiKey;
        let model = '';
        let content = '';

        if (provider === 'groq') {
            if (!resolvedKey) resolvedKey = (process.env.GROQ_API_KEY || '').trim();
            if (!resolvedKey) {
                return NextResponse.json(
                    { error: 'No Groq API key found. Paste a free key in AI Settings or use Google Gemini (free at aistudio.google.com).' },
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
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.2,
                    max_tokens: 2500,
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
                    { error: 'No OpenAI API key found. Paste your OpenAI key in AI Settings, or use the free Gemini option.' },
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
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.2,
                    max_tokens: 2500,
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
                    { error: 'No Gemini API key found. Grab a free key at aistudio.google.com/apikey and paste it in AI Settings.' },
                    { status: 401 }
                );
            }

            // Fallback list of Gemini models
            const candidateModels = [
                modelOverride || 'gemini-2.5-flash',
                'gemini-2.0-flash',
                'gemini-1.5-flash',
                'gemini-3.8-flash',
            ].filter(Boolean);

            let lastError = '';
            for (const candidate of candidateModels) {
                model = candidate;
                try {
                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${encodeURIComponent(geminiKey)}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                                generationConfig: {
                                    temperature: 0.2,
                                    maxOutputTokens: 3000,
                                    responseMimeType: 'application/json',
                                },
                            }),
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        content = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('');
                        if (content.trim()) break;
                    } else {
                        const errText = await response.text();
                        lastError = friendlyProviderError('Gemini', candidate, response.status, errText);
                    }
                } catch (e: any) {
                    lastError = e?.message || 'Network error';
                }
            }

            if (!content.trim()) {
                return NextResponse.json({ error: lastError || 'Gemini could not generate document data. Try another model or Groq.' }, { status: 502 });
            }
        } else {
            return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
        }

        if (!content.trim()) {
            return NextResponse.json({ error: 'AI returned an empty response. Please try again.' }, { status: 502 });
        }

        const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        let parsedData: any = null;
        try {
            parsedData = JSON.parse(cleaned);
        } catch {
            // Attempt to extract JSON from string
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsedData = JSON.parse(jsonMatch[0]);
                } catch {
                    parsedData = null;
                }
            }
        }

        if (!parsedData || typeof parsedData !== 'object') {
            return NextResponse.json({ error: 'Failed to parse AI document response. Please try again.' }, { status: 502 });
        }

        // Ensure item IDs are unique
        if (Array.isArray(parsedData.items)) {
            parsedData.items = parsedData.items.map((item: any, idx: number) => ({
                id: item.id || `ai-${Date.now()}-${idx}`,
                description: String(item.description || 'Deliverable Item').toUpperCase(),
                quantity: Number(item.quantity) || 1,
                rate: Number(item.rate) || 0,
                platform: item.platform || 'Other',
            }));
        }

        return NextResponse.json({
            provider,
            model,
            data: parsedData,
        });
    } catch (err: any) {
        console.error('Business Suite AI API error:', err);
        return NextResponse.json(
            { error: "Could not reach AI provider. Please check your network and API key." },
            { status: 502 }
        );
    }
}
