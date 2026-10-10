import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import AsyncFontLoader from "@/components/AsyncFontLoader";
import ConsentGate from "@/components/ConsentGate";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SITE_BASE_URL } from "@/lib/seo";

// Google Analytics 4 — set NEXT_PUBLIC_GA_ID (Measurement ID "G-…") in
// .env.local once the property exists at analytics.google.com. Until then
// the tag renders nothing and zero GA requests are made.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// App font (owner ruling 2026-10-07): Raleway variable (with italics) —
// loaded ahead of the big tool-font bundle so body text settles early.
const RALEWAY_FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&display=swap";

const GOOGLE_FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Anonymous+Pro:wght@400;700&family=Anton&family=Archivo+Black&family=Bangers&family=Barlow+Condensed:wght@700;900&family=Bebas+Neue&family=Black+Ops+One&family=Bodoni+Moda:opsz,wght@6..96,700;6..96,900&family=Cabin:wght@700&family=Caveat:wght@700&family=Cinzel:wght@700;900&family=Cormorant+Garamond:wght@700&family=Courier+Prime:wght@700&family=Covered+By+Your+Grace&family=Cutive+Mono&family=DM+Sans:wght@700;900&family=DM+Serif+Display&family=EB+Garamond:wght@700;800&family=Fira+Code:wght@700&family=Fjalla+One&family=IBM+Plex+Mono:wght@700&family=Indie+Flower&family=Inter:wght@800;900&family=Kalam:wght@700&family=Libre+Baskerville:wght@700&family=Lora:wght@700&family=Merriweather:wght@700;900&family=Monoton&family=Montserrat:wght@800;900&family=Newsreader:opsz,wght@6..72,700;6..72,800&family=Nunito+Sans:wght@800;900&family=Old+Standard+TT:wght@700&family=Oswald:wght@700&family=Outfit:wght@800;900&family=Permanent+Marker&family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@800&family=Poppins:wght@800;900&family=Prata&family=Righteous&family=Roboto:wght@900&family=Roboto+Mono:wght@700&family=Rock+Salt&family=Russo+One&family=Shadows+Into+Light&family=Source+Code+Pro:wght@700;900&family=Space+Grotesk:wght@700&family=Space+Mono:wght@700&family=Special+Elite&family=Syne:wght@800&family=Ultra&family=VT323&family=Work+Sans:wght@800;900&display=swap";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_BASE_URL),
  // Homepage canonical — every other route sets its own via toolMetadata().
  alternates: { canonical: "/" },
  // SEO audit 2026-10-10: lead with the highest-intent modifier ("free")
  // — the old brand-first title matched zero real queries.
  title: "Free Creator Tools — Video, Captions, Invoices & More | CreatorsKit",
  description: "20+ free tools for video, photo, audio, design & business — match cuts, auto captions, quote cards, invoices and more. No subscriptions. Runs in your browser & offline as a PWA.",
  keywords: ["creator tools", "video editor", "photo editor", "AI tools", "free tools", "browser tools", "PWA", "teleprompter", "match cut", "auto captions", "quote card", "invoice generator"],
  authors: [{ name: "CreatorsKit" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CreatorsKit",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "CreatorsKit — 20+ Free Creator Tools. No Signup. No Watermark.",
    description: "20+ free tools for video, photo, audio, design & business — match cuts, auto captions, quote cards, invoices and more. No subscriptions. Runs in your browser.",
    siteName: "CreatorsKit",
    type: "website",
    images: [{ url: "/og/home.png", width: 1200, height: 630, alt: "CreatorsKit — 20+ free creator tools, no signup, no watermark" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CreatorsKit — 20+ Free Creator Tools. No Signup. No Watermark.",
    description: "20+ free tools for video, photo, audio, design & business — match cuts, auto captions, quote cards, invoices and more. No subscriptions. Runs in your browser.",
    images: ["/og/home.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="shortcut icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Fetch the (very large) fonts CSS early, but never block first paint on it */}
        <link rel="preload" as="style" href={GOOGLE_FONTS_CSS} crossOrigin="anonymous" />
        <AsyncFontLoader href={RALEWAY_FONTS_CSS} />
        <AsyncFontLoader href={GOOGLE_FONTS_CSS} />
        {/* Consent Mode v2 — region-scoped (owner ruling 2026-10-08):
            worldwide default GRANTED (no cookie-consent law in Ghana/US/most
            of the world → ads + analytics live by default), EEA+UK default
            DENIED until the banner choice. An explicit DENY denies analytics
            storage + personalization — with "Limited ads" enabled in AdSense,
            denied visitors still get cookieless NON-personalized ads, so a
            denial never means $0 revenue. This MUST remain the FIRST Google
            script in the document: adsbygoogle.js (below) and GA4 both read
            these defaults, so parse order is what makes them binding.
            beforeInteractive injects it into the initial server HTML and runs
            it before any Next.js module, so it always wins the race. */}
        <Script
          id="ck-consent-default"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted',functionality_storage:'granted',security_storage:'granted'});var EEA=['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','LV','LI','LT','LU','MT','NL','NO','PL','PT','RO','SK','SI','ES','SE','CH','GB','UK'];for(var i=0;i<EEA.length;i++){gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500,region:EEA[i]});}try{var c=localStorage.getItem('ck_consent_v1');if(c==='granted'||c==='denied'){gtag('consent','update',{ad_storage:c,ad_user_data:c,ad_personalization:c,analytics_storage:c,functionality_storage:'granted',security_storage:'granted'});}}catch(e){}`,
          }}
        />
        {/* Google AdSense loader — installed 2026-10-08 (pub ID
            ca-pub-7897650446063664; publisher IDs are public by design).
            Google's exact snippet, on every page as required for account
            review. afterInteractive injects it client-side after hydration,
            so the consent defaults above are always parsed first. */}
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7897650446063664"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        {/* Site-wide structured data (SEO audit 2026-10-10): WebSite +
            Organization entities — the site-level graph Google uses to tie
            every tool page to one publisher. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  name: 'CreatorsKit',
                  url: SITE_BASE_URL,
                  description: '20+ free browser tools for creators — video, photo, audio, design & business.',
                },
                {
                  '@type': 'Organization',
                  name: 'CreatorsKit',
                  url: SITE_BASE_URL,
                  logo: `${SITE_BASE_URL}/logo.png`,
                  slogan: 'Tools for Creators who ship',
                },
              ],
            }),
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground" style={{ margin: 0 }} suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
        {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
        <ConsentGate />
      </body>
    </html>
  );
}
