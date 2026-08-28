import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { SITE_DESC, SITE_NAME } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESC,
  applicationName: SITE_NAME,
  appleWebApp: { capable: true, title: "象限先生", statusBarStyle: "default" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESC,
    type: "website",
    locale: "zh_CN",
    siteName: SITE_NAME,
  },
  twitter: { card: "summary", title: SITE_NAME, description: SITE_DESC },
};

export const viewport: Viewport = {
  themeColor: "#12151b",
};

const THEME_BOOT = `(function(){try{var k="math-theme";var t=localStorage.getItem(k)||"dark";document.documentElement.dataset.theme=t;var c=getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();if(c){var m=document.querySelector("meta[name=\\"theme-color\\"]");if(m)m.setAttribute("content",c);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}