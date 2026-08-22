import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "CreatorKit — Tools for Creators who ship",
  description: "14 brutalist tools for video, photo, audio & design. No subscriptions. Runs in your browser.",
  keywords: ["creator tools", "video editor", "photo editor", "AI tools", "free tools", "browser tools"],
  authors: [{ name: "CreatorKit" }],
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "CreatorKit — Tools for Creators who ship",
    description: "14 brutalist tools for video, photo, audio & design. No subscriptions. Runs in your browser.",
    siteName: "CreatorKit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CreatorKit — Tools for Creators who ship",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Anonymous+Pro:wght@400;700&family=Anton&family=Archivo+Black&family=Bangers&family=Barlow+Condensed:wght@700;900&family=Bebas+Neue&family=Black+Ops+One&family=Bodoni+Moda:opsz,wght@6..96,700;6..96,900&family=Cabin:wght@700&family=Caveat:wght@700&family=Cinzel:wght@700;900&family=Cormorant+Garamond:wght@700&family=Courier+Prime:wght@700&family=Covered+By+Your+Grace&family=Cutive+Mono&family=DM+Sans:wght@700;900&family=DM+Serif+Display&family=EB+Garamond:wght@700;800&family=Fira+Code:wght@700&family=Fjalla+One&family=IBM+Plex+Mono:wght@700&family=Indie+Flower&family=Inter:wght@800;900&family=Kalam:wght@700&family=Libre+Baskerville:wght@700&family=Lora:wght@700&family=Merriweather:wght@700;900&family=Monoton&family=Montserrat:wght@800;900&family=Newsreader:opsz,wght@6..72,700;6..72,800&family=Old+Standard+TT:wght@700&family=Oswald:wght@700&family=Outfit:wght@800;900&family=Permanent+Marker&family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@800&family=Poppins:wght@800;900&family=Prata&family=Righteous&family=Roboto+Mono:wght@700&family=Rock+Salt&family=Russo+One&family=Shadows+Into+Light&family=Source+Code+Pro:wght@700;900&family=Space+Grotesk:wght@700&family=Space+Mono:wght@700&family=Special+Elite&family=Syne:wght@800&family=Ultra&family=VT323&family=Work+Sans:wght@800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-background text-foreground" style={{ margin: 0 }} suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
