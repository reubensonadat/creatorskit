/**
 * src/lib/ai-keyring.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized BYOK (Bring-Your-Own-Key) keyring across CreatorsKit.
 *
 * One unified system that automatically discovers, syncs, and shares keys for:
 * - Google Gemini (free Google AI Studio key: aistudio.google.com/apikey)
 * - Groq Cloud (console.groq.com/keys)
 * - OpenAI (platform.openai.com/api-keys)
 *
 * Seamlessly discovers keys saved in Demystifier, Auto-Captions / Whisper Cloud,
 * or Text-Behind so users never have to paste keys repeatedly.
 */

export type AiProvider = 'gemini' | 'openai' | 'groq';

export interface AiProviderConfig {
    id: AiProvider;
    label: string;
    model: string;
    keyUrl: string;
    note: string;
    keyPrefix?: string;
    keyPlaceholder: string;
    availableModels: string[];
}

export const AI_STORAGE_KEYS = {
    gemini: 'creatorkit_byok_gemini_key',
    openai: 'creatorkit_byok_openai_key',
    groq: 'creatorkit_byok_groq_key',
    activeProvider: 'creatorkit_byok_active_provider',
    modelPrefix: 'creatorkit_byok_model_',
} as const;

/** Known alias storage keys across legacy tools or user configs */
const KEY_ALIASES: Record<AiProvider, string[]> = {
    gemini: [
        'creatorkit_byok_gemini_key',
        'gemini_api_key',
        'google_api_key',
        'geminiApiKey',
        'googleApiKey',
        'ck_gemini_key',
    ],
    openai: [
        'creatorkit_byok_openai_key',
        'openai_api_key',
        'openAiApiKey',
        'openaiKey',
        'ck_openai_key',
    ],
    groq: [
        'creatorkit_byok_groq_key',
        'groq_api_key',
        'groqApiKey',
        'groqKey',
        'ck_groq_key',
    ],
};

export const AI_PROVIDERS: Record<AiProvider, AiProviderConfig> = {
    gemini: {
        id: 'gemini',
        label: 'Google Gemini',
        model: 'gemini-3.8-flash',
        keyUrl: 'https://aistudio.google.com/apikey',
        note: 'FREE GOOGLE KEY · NO CREDIT CARD',
        keyPrefix: 'AIza',
        keyPlaceholder: 'AIzaSy...',
        availableModels: ['gemini-3.8-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
    },
    groq: {
        id: 'groq',
        label: 'Groq Cloud',
        model: 'llama-3.3-70b-versatile',
        keyUrl: 'https://console.groq.com/keys',
        note: 'FREE FAST INFERENCE',
        keyPrefix: 'gsk_',
        keyPlaceholder: 'gsk_...',
        availableModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    },
    openai: {
        id: 'openai',
        label: 'OpenAI',
        model: 'gpt-4o-mini',
        keyUrl: 'https://platform.openai.com/api-keys',
        note: 'GPT-4O MINI / GPT-4O',
        keyPrefix: 'sk-',
        keyPlaceholder: 'sk-proj-...',
        availableModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    },
};

export function notifyKeyringUpdate() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ck_byok_updated'));
    }
}

/**
 * Retrieves the stored API key for a provider.
 * Automatically checks all known suite aliases (Demystifier, captions, etc.)
 * and mirrors the key forward into the unified slot.
 */
export function getStoredAiKey(provider: AiProvider): string {
    if (typeof window === 'undefined') return '';
    try {
        // 1. Direct primary key
        const primary = localStorage.getItem(AI_STORAGE_KEYS[provider])?.trim();
        if (primary) return primary;

        // 2. Scan all fallback aliases across demystify / captions / custom scripts
        const aliases = KEY_ALIASES[provider] || [];
        for (const alias of aliases) {
            const val = localStorage.getItem(alias)?.trim();
            if (val) {
                // Auto-sync back to primary key so other tools see it immediately
                localStorage.setItem(AI_STORAGE_KEYS[provider], val);
                return val;
            }
        }

        return '';
    } catch {
        return '';
    }
}

export function setStoredAiKey(provider: AiProvider, key: string): void {
    if (typeof window === 'undefined') return;
    try {
        const cleaned = key.trim();
        if (cleaned) {
            localStorage.setItem(AI_STORAGE_KEYS[provider], cleaned);
            // Also sync legacy caption key slot if applicable
            if (provider === 'gemini') localStorage.setItem('creatorkit_byok_gemini_key', cleaned);
            if (provider === 'groq') localStorage.setItem('creatorkit_byok_groq_key', cleaned);
            if (provider === 'openai') localStorage.setItem('creatorkit_byok_openai_key', cleaned);
        } else {
            localStorage.removeItem(AI_STORAGE_KEYS[provider]);
        }
        notifyKeyringUpdate();
    } catch {
        /* storage full or disabled */
    }
}

export function hasStoredAiKey(provider: AiProvider): boolean {
    return Boolean(getStoredAiKey(provider));
}

/**
 * Intelligent Provider Selection Algorithm:
 * 1. Honors explicit activeProvider choice IF a key is present for it.
 * 2. If activeProvider has no key, checks legacy preference from whisper-cloud / demystify.
 * 3. Otherwise auto-selects the best available key:
 *    - Gemini (priority: 100% free with no credit card at AI Studio, best structured JSON layout output)
 *    - Groq (priority 2: ultra fast sub-second inference)
 *    - OpenAI (priority 3)
 */
export function getActiveAiProvider(): AiProvider {
    if (typeof window === 'undefined') return 'gemini';
    try {
        const saved = localStorage.getItem(AI_STORAGE_KEYS.activeProvider) as AiProvider;
        if (saved && (saved === 'gemini' || saved === 'openai' || saved === 'groq')) {
            if (hasStoredAiKey(saved)) {
                return saved;
            }
        }

        // Check whisper-cloud preference
        const whisperSaved = localStorage.getItem('creatorkit_transcription_provider') as AiProvider;
        if (whisperSaved && (whisperSaved === 'gemini' || whisperSaved === 'groq' || whisperSaved === 'openai')) {
            if (hasStoredAiKey(whisperSaved)) {
                return whisperSaved;
            }
        }
    } catch {
        /* ignore */
    }

    // Auto-detect which provider has a key, prioritizing Gemini
    if (hasStoredAiKey('gemini')) return 'gemini';
    if (hasStoredAiKey('groq')) return 'groq';
    if (hasStoredAiKey('openai')) return 'openai';
    return 'gemini';
}

export function setActiveAiProvider(provider: AiProvider): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(AI_STORAGE_KEYS.activeProvider, provider);
        notifyKeyringUpdate();
    } catch {
        /* ignore */
    }
}

/**
 * Retrieves the preferred/auto-picked model for the provider:
 * 1. Explicit model picked by user in settings / demystifier
 * 2. Optimal default model for the provider
 */
export function getStoredAiModel(provider: AiProvider): string {
    if (typeof window === 'undefined') return AI_PROVIDERS[provider].model;
    try {
        const stored = localStorage.getItem(`${AI_STORAGE_KEYS.modelPrefix}${provider}`)?.trim();
        if (stored) {
            // Auto-migrate retired 2.5 and 1.5-pro models to gemini-3.8-flash
            if (provider === 'gemini' && (stored.includes('2.5') || stored.includes('1.5-pro') || stored === 'gemini-pro')) {
                localStorage.setItem(`${AI_STORAGE_KEYS.modelPrefix}${provider}`, 'gemini-3.8-flash');
                return 'gemini-3.8-flash';
            }
            return stored;
        }

        // Check if demystifier saved a model
        const demystifySaved = localStorage.getItem('creatorkit_demystify_modelPick')?.trim();
        if (demystifySaved) {
            if (provider === 'gemini' && (demystifySaved.includes('2.5') || demystifySaved.includes('1.5-pro') || demystifySaved === 'gemini-pro')) {
                return 'gemini-3.8-flash';
            }
            return demystifySaved;
        }
    } catch {
        /* ignore */
    }
    return AI_PROVIDERS[provider].model;
}

export function setStoredAiModel(provider: AiProvider, model: string): void {
    if (typeof window === 'undefined') return;
    try {
        const cleaned = model.trim();
        if (cleaned) {
            localStorage.setItem(`${AI_STORAGE_KEYS.modelPrefix}${provider}`, cleaned);
        } else {
            localStorage.removeItem(`${AI_STORAGE_KEYS.modelPrefix}${provider}`);
        }
        notifyKeyringUpdate();
    } catch {
        /* ignore */
    }
}
