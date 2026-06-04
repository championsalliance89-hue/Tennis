import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SetEdge — Tennis Predictions",
  description:
    "Daily Over/Under and Set Winner predictions for Tennis and Table Tennis, powered by Elo ratings, form, and head-to-head analysis.",
  keywords: ["tennis predictions", "table tennis", "sports analytics", "elo rating"],
  openGraph: {
    title: "SetEdge — Tennis Predictions",
    description: "Daily AI-powered tennis predictions. Over/Under and Set Winner markets.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080d18",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="relative z-10">{children}</body>
    </html>
  );
}
