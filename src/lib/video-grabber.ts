/**
 * CreatorKit · Video Grabber — client library
 * Talks to the Supabase Edge Function supervisor (ad-gated downloads).
 */

export const VIDEO_GRAB_ENDPOINT =
    process.env.NEXT_PUBLIC_VIDEO_GRAB_ENDPOINT ||
    'https://lnfzixiwmdxoqoueadkq.supabase.co/functions/v1/video-grab';

export type Platform =
    | 'youtube'
    | 'tiktok'
    | 'instagram'
    | 'x'
    | 'facebook'
    | 'vimeo'
    | 'reddit'
    | 'soundcloud'
    | 'direct'
    | 'other';

export const PLATFORM_LABELS: Record<Platform, string> = {
    youtube: 'YouTube',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    x: 'X / Twitter',
    facebook: 'Facebook',
    vimeo: 'Vimeo',
    reddit: 'Reddit',
    soundcloud: 'SoundCloud',
    direct: 'Direct File',
    other: 'Web Page',
};

export function detectPlatform(url: string): Platform {
    const host = (() => {
        try {
            return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
        } catch {
            return '';
        }
    })();
    if (/youtube\.com$|youtu\.be$/.test(host)) return 'youtube';
    if (/tiktok\.com$/.test(host)) return 'tiktok';
    if (/instagram\.com$/.test(host)) return 'instagram';
    if (/twitter\.com$|x\.com$/.test(host)) return 'x';
    if (/facebook\.com$|fb\.watch$/.test(host)) return 'facebook';
    if (/vimeo\.com$/.test(host)) return 'vimeo';
    if (/reddit\.com$|redd\.it$/.test(host)) return 'reddit';
    if (/soundcloud\.com$/.test(host)) return 'soundcloud';
    if (/\.(mp4|webm|m4v|mov|mkv|mp3|m4a|ogg|wav|aac|flac)(\?|$)/i.test(url)) return 'direct';
    return 'other';
}

export interface GrabMetadata {
    title?: string;
    thumbnail?: string;
    provider?: string;
}

/** Best-effort metadata via noembed (CORS-friendly oEmbed aggregator). */
export async function fetchMetadata(url: string): Promise<GrabMetadata | null> {
    try {
        const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.error) return null;
        return {
            title: typeof data.title === 'string' ? data.title : undefined,
            thumbnail: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : undefined,
            provider: typeof data.provider_name === 'string' ? data.provider_name : undefined,
        };
    } catch {
        return null;
    }
}

export class GrabError extends Error {
    code: string;
    constructor(message: string, code: string) {
        super(message);
        this.code = code;
    }
}

export interface ChallengeResult {
    challengeId: string;
    waitSeconds: number;
    remainingToday: number;
}

/** Step 1 — ask the supervisor to open an ad challenge. */
export async function createChallenge(url: string): Promise<ChallengeResult> {
    const res = await fetch(VIDEO_GRAB_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'challenge', url }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new GrabError(data?.error ?? 'Could not start the unlock.', data?.code ?? 'unknown');
    return data as ChallengeResult;
}

export interface ClaimResult {
    mode: 'direct' | 'worker';
    streamUrl: string;
    platform: Platform;
    expiresInSeconds: number;
}

/** Step 2 — after the ad wait, claim the one-time download ticket. */
export async function claimDownload(url: string, challengeId: string): Promise<ClaimResult> {
    const res = await fetch(VIDEO_GRAB_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', url, challengeId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new GrabError(data?.error ?? 'Could not unlock the download.', data?.code ?? 'unknown');
    return data as ClaimResult;
}
