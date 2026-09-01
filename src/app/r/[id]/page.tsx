import ShortLinkClientView from './client-view';

/**
 * Short-link client view (/r/<id>) — server entry.
 *
 * Cloudflare Pages (@cloudflare/next-on-pages) requires every non-static
 * route to run on the Edge Runtime, so the segment config lives here and all
 * client behaviour (fetch, decode, animated printer) is delegated to
 * ShortLinkClientView.
 */
export const runtime = 'edge';

export default function ShortReceiptPage() {
  return <ShortLinkClientView />;
}
