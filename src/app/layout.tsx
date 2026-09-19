import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ui/ServiceWorkerRegistrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpotFish! — Peta Komunitas Spot Mancing",
  description: "Temukan dan berbagi lokasi spot mancing terbaik di Indonesia. Platform community-driven berbasis peta interaktif.",
  keywords: ["mancing", "fishing", "spot mancing", "peta", "indonesia", "komunitas"],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "SpotFish! — Peta Komunitas Spot Mancing",
    description: "Temukan dan berbagi lokasi spot mancing terbaik di Indonesia.",
    images: [{ url: "/og-image.svg", width: 1200, height: 630 }],
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpotFish! — Peta Komunitas Spot Mancing",
    description: "Temukan dan berbagi lokasi spot mancing terbaik di Indonesia.",
    images: ["/og-image.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("spotfish-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
