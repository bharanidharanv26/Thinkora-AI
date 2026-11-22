import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: { default: "Thinkora AI — Adaptive Exam-Prep Tutor", template: "%s | Thinkora AI" }, description: "Your personal exam-prep tutor. Learn, explain your thinking, and revise with a plan adapted to your understanding.", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff", interactiveWidget: "resizes-content" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="min-h-dvh antialiased"><a href="#main" className="sr-only z-50 rounded bg-white p-3 focus:not-sr-only focus:absolute">Skip to content</a>{children}</body></html>;
}
