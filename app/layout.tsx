import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Passdari",
  description: "Loyalty stamp cards and rewards on Solana, owned by the customer",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <TopBar />
        <main className="flex-1">
          <WalletContextProvider>{children}</WalletContextProvider>
        </main>
        <Footer />
      </body>
    </html>
  );
}