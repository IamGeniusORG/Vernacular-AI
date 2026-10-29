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
import BackendKeepAlive from "@/components/BackendKeepAlive";

export const metadata: Metadata = {
  title: "Artisan Storefront",
  description: "Vernacular AI E-Commerce Enabler",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Artisan Storefront",
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
              {children}
              <BackendKeepAlive />
            </ArtisanProvider>
          </PreferencesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
