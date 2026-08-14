import type { Metadata, Viewport } from "next";
import "./globals.css";

const demo = process.env.ISOMILL_DEMO === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const viewport: Viewport = {
  themeColor: "#16130e",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    demo
      ? `https://bvisagie.github.io${basePath || "/isomill"}`
      : "http://127.0.0.1:3000",
  ),
  title: "isomill — installation media that explains itself",
  description:
    "Open-source installer compiler. A Machine Definition becomes a thin official Fedora or Ubuntu installer ISO with a provenance graph on the image.",
  applicationName: "isomill",
  openGraph: {
    title: "isomill",
    description: "Installation media that explains itself.",
    images: [{ url: "/og.png", width: 1280, height: 640, alt: "isomill" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "isomill",
    description: "Installation media that explains itself.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
