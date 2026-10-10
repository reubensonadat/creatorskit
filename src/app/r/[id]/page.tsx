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

// noindex (SEO audit 2026-10-10): /r/<id> are private share links for
// generated documents (invoices, receipts, agreements) — client viewers,
// never search entry points. Keeps crawl budget on real landing pages and
// prevents other people's documents from entering the index.
export const metadata = {
    robots: { index: false, follow: false },
};

export default function ShortReceiptPage() {
  return <ShortLinkClientView />;
}
