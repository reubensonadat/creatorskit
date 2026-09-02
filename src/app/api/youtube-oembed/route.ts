import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export function extractYouTubeVideoId(url: string): { videoId: string | null; isShort: boolean } {
  if (!url) return { videoId: null, isShort: false };

  // Check for shorts
  const shortsMatch = url.match(/(?:shorts\/|shorts\?v=)([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) {
    return { videoId: shortsMatch[1], isShort: true };
  }

  // Standard YouTube URL formats
  const standardMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/);
  if (standardMatch && standardMatch[1]) {
    return { videoId: standardMatch[1], isShort: false };
  }

  // Direct 11-character ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
    return { videoId: url.trim(), isShort: false };
  }

  return { videoId: null, isShort: false };
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const { videoId, isShort } = extractYouTubeVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL or Video ID' }, { status: 400 });
    }

    // Call official YouTube public oEmbed endpoint
    let title = 'YouTube Video';
    let authorName = 'YouTube Creator';
    let authorUrl = '';
    let viewsText = isShort ? '1.8M views' : '380K views';
    let durationText = isShort ? '0:54' : '15:20';
    let timeAgoText = '3 days ago';
    let channelAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=Creator`;

    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        next: { revalidate: 3600 },
      });
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.title) title = data.title;
        if (data.author_name) {
          authorName = data.author_name;
          channelAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(authorName)}`;
        }
        if (data.author_url) authorUrl = data.author_url;
      }
    } catch {
      // Fallback
    }

    let detectedIsShort = isShort;

    // Try fetching lightweight video page to extract exact views, duration, and aspect ratio / shorts eligibility
    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        next: { revalidate: 3600 },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();

        // Extract view count
        const viewMatch = html.match(/"viewCount":"(\d+)"/);
        if (viewMatch && viewMatch[1]) {
          const count = parseInt(viewMatch[1], 10);
          if (count >= 1_000_000) {
            viewsText = `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
          } else if (count >= 1_000) {
            viewsText = `${Math.round(count / 1_000)}K views`;
          } else {
            viewsText = `${count} views`;
          }
        }

        // Extract duration in seconds
        let totalDurationSec = 0;
        const lengthMatch = html.match(/"approxDurationMs":"(\d+)"/) || html.match(/"lengthSeconds":"(\d+)"/);
        if (lengthMatch && lengthMatch[1]) {
          totalDurationSec = Math.round(parseInt(lengthMatch[1], 10) / (lengthMatch[0].includes('approxDurationMs') ? 1000 : 1));
          const mins = Math.floor(totalDurationSec / 60);
          const secs = totalDurationSec % 60;
          durationText = `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        // YouTube Shorts Check (< 3 minutes / <= 180s + Vertical / Reels criteria)
        const isReelOrShortsHtml = html.includes('"isShortsEligible":true') || 
          html.includes('reelPlayerOverlayRenderer') || 
          html.includes('/shorts/') ||
          html.includes('"isReel":true');

        if (isShort || (totalDurationSec > 0 && totalDurationSec <= 180 && isReelOrShortsHtml)) {
          detectedIsShort = true;
        }

        // Extract real YouTube channel avatar from page HTML (yt3.ggpht.com)
        const avatarMatch = html.match(/"avatar":\s*\{\s*"thumbnails":\s*\[\s*\{\s*"url":\s*"([^"]+)"/i) 
          || html.match(/"thumbnail":\s*\{\s*"thumbnails":\s*\[\s*\{\s*"url":\s*"(https:\/\/(?:yt3\.ggpht\.com|yt3\.googleusercontent\.com)[^"]+)"/i)
          || html.match(/"(https:\/\/(?:yt3\.ggpht\.com|yt3\.googleusercontent\.com)\/[^"=]+)=s\d+[^"]*"/i);

        if (avatarMatch && avatarMatch[1]) {
          channelAvatar = avatarMatch[1]
            .replace(/\\u0026/g, '&')
            .replace('yt3.ggpht.com', 'yt3.googleusercontent.com');
        }
      }
    } catch {
      // Ignore page scraping error
    }

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const hqThumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    return NextResponse.json({
      success: true,
      videoId,
      isShort: detectedIsShort,
      format: detectedIsShort ? 'shorts' : 'longform',
      title,
      authorName,
      authorUrl,
      views: viewsText,
      duration: durationText,
      timeAgo: timeAgoText,
      thumbnailUrl,
      hqThumbnailUrl,
      channelAvatar,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch YouTube metadata' }, { status: 500 });
  }
}
