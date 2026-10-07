import type { Metadata, Viewport } from "next";
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
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_BASE_URL),
  // Homepage canonical — every other route sets its own via toolMetadata().
  alternates: { canonical: "/" },
  title: "CreatorsKit — Tools for Creators who ship",
  description: "14 brutalist tools for video, photo, audio & design. No subscriptions. Runs in your browser & offline as a PWA.",
  keywords: ["creator tools", "video editor", "photo editor", "AI tools", "free tools", "browser tools", "PWA", "space planner", "teleprompter"],
  authors: [{ name: "CreatorsKit" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
    title: "CreatorsKit — Tools for Creators who ship",
    description: "14 brutalist tools for video, photo, audio & design. No subscriptions. Runs in your browser.",
    siteName: "CreatorsKit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CreatorsKit — Tools for Creators who ship",
    description: "14 brutalist tools for video, photo, audio & design. No subscriptions. Runs in your browser.",
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
      </head>
      <body className="antialiased bg-background text-foreground" style={{ margin: 0 }} suppressHydrationWarning>
        {/* Consent Mode v2 — denied by default. This inline runs BEFORE the
            GA script (raw scripts execute during parse; GoogleAnalytics loads
            afterInteractive), so nothing is stored before the banner choice.
            Returning visitors with a stored "granted" are re-granted here. */}
        <script
          id="ck-consent-default"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});try{var c=localStorage.getItem('ck_consent_v1');if(c==='granted'||c==='denied'){gtag('consent','update',{ad_storage:c,ad_user_data:c,ad_personalization:c,analytics_storage:c,functionality_storage:'granted',security_storage:'granted'});}}catch(e){}`,
          }}
        />
        <ClientLayout>{children}</ClientLayout>
        {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
        <ConsentGate />
      </body>
    </html>
  );
}
