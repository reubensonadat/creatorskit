/**
 * src/lib/directory-likes.ts — the "like" system for the /components hub
 * (owner ruling 2026-11-06: "allow me to like sites so i can order sites
 * from top to bottom in my way").
 * ─────────────────────────────────────────────────────────────────────────────
 * The liked order IS the shelf order: array position 0 is the top of the hub.
 * Liking unshifts (the newest like floats to the top) and unliking removes,
 * so reshuffling means simply re-liking a site — it jumps back to pole
 * position. 100% local, plain localStorage under the house `ck_` prefix
 * (same convention as src/lib/app-home.ts). Slugs that no longer exist in
 * the dataset are filtered out on read, so curating the directory never
 * leaves ghost hearts behind.
 */
import { useCallback, useEffect, useState } from 'react';
import { COMPONENT_SITES } from '@/data/component-directory';

const LIKES_KEY = 'ck_directory_likes_v1';
/** Same-document ping so every mounted hook instance (hub cards, detail header) re-reads instantly. */
const LIKES_EVENT = 'ck-directory-likes';

const KNOWN_SLUGS = new Set(COMPONENT_SITES.map((s) => s.slug));

function readLikes(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(LIKES_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((v): v is string => typeof v === 'string' && KNOWN_SLUGS.has(v));
    } catch {
        return [];
    }
}

function writeLikes(list: string[]): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(LIKES_KEY, JSON.stringify(list));
    } catch {
        /* storage full / private mode — likes just won't persist */
    }
}

/** Liked slugs, top-of-hub first. */
export function getLikedSlugs(): string[] {
    return readLikes();
}

export function isSiteLiked(slug: string): boolean {
    return readLikes().includes(slug);
}

/** Toggle a like. Liking moves the site to the TOP of the order; returns the new list. */
export function toggleSiteLike(slug: string): string[] {
    const list = readLikes();
    const next = list.includes(slug) ? list.filter((s) => s !== slug) : [slug, ...list];
    writeLikes(next);
    window.dispatchEvent(new CustomEvent(LIKES_EVENT));
    return next;
}

/**
 * React binding for the likes. Starts empty and reads after mount (keeps SSR
 * markup stable), then stays in sync across every hook instance and every tab
 * via the CustomEvent + storage events.
 */
export function useSiteLikes(): { likes: string[]; liked: (slug: string) => boolean; toggle: (slug: string) => void } {
    const [likes, setLikes] = useState<string[]>([]);

    useEffect(() => {
        const sync = () => setLikes(readLikes());
        sync();
        window.addEventListener(LIKES_EVENT, sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener(LIKES_EVENT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    const toggle = useCallback((slug: string) => setLikes(toggleSiteLike(slug)), []);
    const liked = useCallback((slug: string) => likes.includes(slug), [likes]);

    return { likes, liked, toggle };
}
