import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "isomill — installation media that explains itself",
  description:
    "Open-source installer compiler. A Machine Definition becomes a thin official Fedora or Ubuntu installer ISO with a provenance graph on the image.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
