/**
 * src/lib/business-ai.ts
 *
 * Client-side bridge connecting the Business Suite with CreatorsKit's
 * centralized BYOK (Bring-Your-Own-Key) keyring (Google Gemini, Groq, OpenAI).
 */

import {
    getActiveAiProvider,
    getStoredAiKey,
    getStoredAiModel,
    hasStoredAiKey,
    type AiProvider,
} from './ai-keyring';
import type { ParsedDocumentData } from './business-smart-builder';

export interface BusinessAiResult {
    success: boolean;
    data?: ParsedDocumentData;
    error?: string;
    provider?: AiProvider;
    model?: string;
}

/**
 * Generate complete, structured invoice, receipt, agreement, or proposal data
 * from any conversational user prompt using the active BYOK provider.
 */
export async function generateBusinessDocumentWithAi(
    prompt: string,
    docType: 'invoice' | 'receipt' | 'agreement' | 'letterhead' = 'invoice'
): Promise<BusinessAiResult> {
    const trimmed = prompt.trim();
    if (!trimmed) {
        return { success: false, error: 'Please enter a prompt or deal description.' };
    }

    const provider = getActiveAiProvider();
    const apiKey = getStoredAiKey(provider);
    const model = getStoredAiModel(provider);

    try {
        const res = await fetch('/api/business/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: trimmed,
                docType,
                provider,
                apiKey,
                model,
            }),
        });

        const json = await res.json();

        if (!res.ok) {
            return {
                success: false,
                error: json.error || `AI generation failed (status ${res.status})`,
                provider,
                model,
            };
        }

        return {
            success: true,
            data: json.data as ParsedDocumentData,
            provider: json.provider || provider,
            model: json.model || model,
        };
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || 'Could not reach AI generation service.',
            provider,
            model,
        };
    }
}
