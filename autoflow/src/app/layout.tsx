import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AUTOFLOW", template: "%s · AUTOFLOW" },
  description: "Platformă de gestiune pentru parcuri auto — BLUR Advertising",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0e11" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("af_theme")?.value;
  return (
    <html
      lang="ro"
      data-theme={theme === "light" || theme === "dark" ? theme : undefined}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh font-sans text-[14px] leading-relaxed">{children}</body>
    </html>
  );
}
