'use client';

/**
 * SiteLikeButton — the client heart toggle for the /components/[slug] header.
 *
 * Shares the exact same localStorage likes (`ck_directory_likes_v1`) as the
 * hub's cards via src/lib/directory-likes.ts, so a like from either place
 * shows up everywhere: same tab via the CustomEvent ping, other tabs via the
 * storage event. Liking a site also moves it to the TOP of the owner's
 * /components shelf (newest like first — re-like to re-promote).
 */

import { Heart } from 'lucide-react';
import { useSiteLikes } from '@/lib/directory-likes';

export default function SiteLikeButton({ slug, name }: { slug: string; name: string }) {
    const { liked, toggle } = useSiteLikes();
    const isLiked = liked(slug);
    return (
        <button
            onClick={() => toggle(slug)}
            aria-pressed={isLiked}
            aria-label={isLiked ? `Remove ${name} from your likes` : `Like ${name} — moves it to your top`}
            title={isLiked ? 'Liked — pinned at your top on /components (re-like to re-promote)' : 'Like — rises to your top on /components'}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 14px',
                background: isLiked ? '#dc2626' : '#fff',
                color: isLiked ? '#fff' : '#000',
                border: '3px solid #000',
                borderRadius: 9,
                boxShadow: '3px 3px 0 #000',
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '0.68rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                flexShrink: 0,
            }}
        >
            <Heart size={14} strokeWidth={2.75} fill={isLiked ? '#fff' : 'none'} />
            {isLiked ? 'Liked' : 'Like'}
        </button>
    );
}
