import type { Metadata } from "next";
import { Big_Shoulders, Martian_Mono, Figtree } from "next/font/google";
import Script from "next/script";
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

// Sets `data-theme="dark"` on <html> before the browser paints anything, so a dark-mode visitor never
// sees a flash of the light theme while the page loads. Has to be a literal inline script, not a module
// that imports THEME_STORAGE_KEY from lib/theme.ts — by the time any imported code could run, the first
// frame may already be painted. Keep this copy of the key in sync with lib/theme.ts by hand.
//
// A plain <script> tag written directly in this JSX does not reliably run before hydration in the App
// Router — React treats it as a tree to reconcile on the client, not a pass-through the browser executes
// once while parsing. next/script's `beforeInteractive` strategy is Next's own mechanism for exactly
// this: Next hoists it into the real document <head> and runs it ahead of hydration, wherever in the
// tree the <Script> component itself sits.
const THEME_INIT_SCRIPT = `(function(){try{var t,s=localStorage.getItem("passdari-theme");if(s==="light"||s==="dark"){t=s}else{t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}if(t==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${mono.variable} ${body.variable} h-full antialiased`}
      // The script above sets data-theme on this element before React hydrates, which would otherwise
      // make React warn about a server/client mismatch on an attribute it does not itself control.
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <Script id="theme-init" strategy="beforeInteractive">{THEME_INIT_SCRIPT}</Script>
        <TopBar />
        <main className="flex-1">
          <WalletContextProvider>{children}</WalletContextProvider>
        </main>
        <Footer />
      </body>
    </html>
  );
}
