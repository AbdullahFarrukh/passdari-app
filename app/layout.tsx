import type { Metadata } from "next";
import { Big_Shoulders, Martian_Mono, Figtree } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";

const display = Big_Shoulders({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const mono = Martian_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const body = Figtree({
  variable: "--font-body",
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
      className={`${display.variable} ${mono.variable} ${body.variable} h-full antialiased`}
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
