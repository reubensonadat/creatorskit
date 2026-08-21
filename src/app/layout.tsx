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
      <body className="antialiased bg-background text-foreground" style={{ margin: 0 }} suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
