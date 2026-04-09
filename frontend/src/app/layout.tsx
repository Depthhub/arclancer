import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ArcLancer - Keep 98% of What You Earn",
  description: "The freelance platform that stops fees from eating your income. Secure milestone escrow and instant global payouts in your local currency.",
  keywords: ["freelance", "escrow", "blockchain", "Arc", "StableFX", "crypto", "payments"],
};

// Inline script to prevent wallet extension conflicts
// Multiple extensions (MetaMask, Phantom, etc.) fight over window.ethereum
// This ensures the property stays configurable so they can coexist
const walletCompatScript = `
  if (typeof window !== 'undefined') {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
    if (!descriptor || descriptor.configurable) {
      let currentProvider = window.ethereum;
      Object.defineProperty(window, 'ethereum', {
        get() { return currentProvider; },
        set(newProvider) { currentProvider = newProvider; },
        configurable: true,
        enumerable: true,
      });
    }
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <head>
        <Script
          id="wallet-compat"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: walletCompatScript }}
        />
      </head>
      <body className={`${plusJakartaSans.variable} antialiased bg-white text-neutral-600 min-h-screen flex flex-col font-sans`}>
        <Providers>
          <Header />
          <main className="flex-1 pt-16">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
