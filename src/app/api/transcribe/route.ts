import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 60;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, Math.min(i + chunkSize, len))));
    }
    return btoa(binary);
}

interface WhisperWord {
    word: string;
    start: number;
    end: number;
}

interface WhisperSegment {
    id: number;
    start: number;
    end: number;
    text: string;
    words?: WhisperWord[];
}

interface WhisperVerboseResponse {
    text: string;
    language?: string;
    duration?: number;
    words?: WhisperWord[];
    segments?: WhisperSegment[];
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const provider = (formData.get('provider') as string) || 'groq';
        const userApiKey = (formData.get('apiKey') as string) || '';
        const language = (formData.get('language') as string) || 'en';
        const prompt = (formData.get('prompt') as string) || '';

        if (!file) {
            return NextResponse.json({ error: 'Missing audio/video file in request.' }, { status: 400 });
        }

        // Determine API key: use BYOK provided by user or server fallback env
        let resolvedKey = userApiKey.trim();

        if (provider === 'groq') {
            if (!resolvedKey) {
                resolvedKey = (process.env.GROQ_API_KEY || '').trim();
            }
            if (!resolvedKey) {
                return NextResponse.json(
                    {
                        error:
                            'No Groq API Key provided. Enter your free Groq API key in the Cloud Settings (get one instantly at console.groq.com/keys) or run local offline Whisper.',
                    },
                    { status: 401 }
                );
            }

            // Call Groq Whisper API with verbose_json and word-level timestamps
            const groqFormData = new FormData();
            groqFormData.append('file', file, file.name || 'audio.webm');
            groqFormData.append('model', 'whisper-large-v3');
            groqFormData.append('response_format', 'verbose_json');
            groqFormData.append('timestamp_granularities[]', 'word');
            groqFormData.append('timestamp_granularities[]', 'segment');
            if (language) groqFormData.append('language', language);
            if (prompt) groqFormData.append('prompt', prompt.slice(0, 500));

            const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${resolvedKey}`,
                },
                body: groqFormData,
            });

            if (!response.ok) {
                const errText = await response.text();
                return NextResponse.json(
                    { error: `Groq Whisper Error (${response.status}): ${errText}` },
                    { status: response.status }
                );
            }

            const data: WhisperVerboseResponse = await response.json();
            return NextResponse.json({
                provider: 'groq',
                model: 'whisper-large-v3',
                text: data.text,
                words: data.words || [],
                segments: data.segments || [],
            });
        }

        if (provider === 'openai') {
            if (!resolvedKey) {
                resolvedKey = (process.env.OPENAI_API_KEY || '').trim();
            }
            if (!resolvedKey) {
                return NextResponse.json(
                    {
                        error:
                            'No OpenAI API Key provided. Please provide your OpenAI API key in Cloud Settings or use free in-browser Whisper.',
                    },
                    { status: 401 }
                );
            }

            const openAiFormData = new FormData();
            openAiFormData.append('file', file, file.name || 'audio.webm');
            openAiFormData.append('model', 'whisper-1');
            openAiFormData.append('response_format', 'verbose_json');
            openAiFormData.append('timestamp_granularities[]', 'word');
            openAiFormData.append('timestamp_granularities[]', 'segment');
            if (language) openAiFormData.append('language', language);
            if (prompt) openAiFormData.append('prompt', prompt.slice(0, 500));

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${resolvedKey}`,
                },
                body: openAiFormData,
            });

            if (!response.ok) {
                const errText = await response.text();
                return NextResponse.json(
                    { error: `OpenAI Whisper Error (${response.status}): ${errText}` },
                    { status: response.status }
                );
            }

            const data: WhisperVerboseResponse = await response.json();
            return NextResponse.json({
                provider: 'openai',
                model: 'whisper-1',
                text: data.text,
                words: data.words || [],
                segments: data.segments || [],
            });
        }

        if (provider === 'gemini') {
            const geminiKey = (resolvedKey || process.env.GEMINI_API_KEY || '').trim();
            if (!geminiKey) {
                return NextResponse.json(
                    {
                        error:
                            'GEMINI_API_KEY is not configured on the server. Please provide an API key or use Groq / Local Whisper.',
                    },
                    { status: 401 }
                );
            }

            // Gemini audio transcription fallback via direct REST API
            const arrayBuffer = await file.arrayBuffer();
            const base64Audio = arrayBufferToBase64(arrayBuffer);
            const mimeType = file.type || 'audio/webm';

            const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: 'user',
                                parts: [
                                    {
                                        inlineData: {
                                            data: base64Audio,
                                            mimeType: mimeType.includes('audio') ? mimeType : 'audio/webm',
                                        },
                                    },
                                    {
                                        text:
                                            'Accurately transcribe this audio verbatim for social video subtitles. ' +
                                            'Return a valid JSON array of objects with the exact schema: ' +
                                            '[{"start": number (seconds), "end": number (seconds), "text": string (short 3-5 word phrase)}]. ' +
                                            'Do not wrap in markdown or backticks, just return raw valid JSON.',
                                    },
                                ],
                            },
                        ],
                    }),
                }
            );

            if (!geminiRes.ok) {
                const errText = await geminiRes.text();
                return NextResponse.json(
                    { error: `Gemini API Error (${geminiRes.status}): ${errText}` },
                    { status: geminiRes.status }
                );
            }

            const geminiData = await geminiRes.json();
            const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]';
            const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            let parsedCues: Array<{ start: number; end: number; text: string }> = [];
            try {
                parsedCues = JSON.parse(cleanedJson);
            } catch {
                parsedCues = [{ start: 0, end: 5, text: rawText }];
            }

            return NextResponse.json({
                provider: 'gemini',
                model: 'gemini-2.5-flash',
                text: parsedCues.map((c) => c.text).join(' '),
                words: [],
                segments: parsedCues,
            });
        }

        return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    } catch (err: any) {
        console.error('Transcription API error:', err);
        return NextResponse.json(
            { error: err.message || 'Server-side transcription failed.' },
            { status: 500 }
        );
    }
}
