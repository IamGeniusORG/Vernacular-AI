import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { LanguageProvider } from "@/context/LanguageContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import { ArtisanProvider } from "@/context/ArtisanContext";
import { LanguageTransitionProvider } from "@/components/LanguageTransitionProvider";
import BackendKeepAlive from "@/components/BackendKeepAlive";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://vernacular-storefront.onrender.com"
  ),
  title: "Vernacular AI - Global Digital Sovereignty for Rural Artisans",
  description:
    "Discover authentic handlooms directly from the weavers. Zero commission, multilingual AI, and direct global shipping.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
      { url: "/B%20logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Vernacular AI - Global Digital Sovereignty for Rural Artisans",
    description:
      "Discover authentic handlooms directly from the weavers. Zero commission, multilingual AI, and direct global shipping.",
    url: "https://vernacular-storefront.onrender.com",
    siteName: "Vernacular AI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vernacular AI - Empowering Rural Weavers with Multimodal AI",
      },
      {
        url: "/logo.png",
        width: 2752,
        height: 1536,
        alt: "Vernacular AI Official Brand Logo",
      },
      {
        url: "/B%20logo.png",
        width: 2752,
        height: 1536,
        alt: "Vernacular AI Official Brand Artwork",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vernacular AI - Global Digital Sovereignty for Rural Artisans",
    description:
      "Discover authentic handlooms directly from the weavers. Zero commission, multilingual AI, and direct global shipping.",
    images: ["/og-image.png", "/logo.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vernacular AI",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <PreferencesProvider>
            <ArtisanProvider>
              <LanguageTransitionProvider>
                {children}
                <BackendKeepAlive />
              </LanguageTransitionProvider>
            </ArtisanProvider>
          </PreferencesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
