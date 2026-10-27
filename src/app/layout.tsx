import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const ethiopic = Noto_Sans_Ethiopic({ variable: "--font-ethiopic", subsets: ["ethiopic"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Kutir Countdown Calendar",
  description:
    "An Ethiopian countdown calendar with daily tasks that carry over, Orthodox saints' days, and a log of time spent on social apps.",
  manifest: `${base}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "Kutir", statusBarStyle: "black-translucent" },
  icons: { apple: `${base}/apple-touch-icon.png` },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#090d0b" },
  ],
};

// Applies the saved light/dark choice before first paint, so the page never flashes.
const themeScript = `try{var t=localStorage.getItem("kutir-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${figtree.variable} ${ethiopic.variable} ${jetbrains.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
