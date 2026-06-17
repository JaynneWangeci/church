import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "AIPCA Bahati Harambee 2026 — Tujenge Pamoja",
  description:
    "Support the AIPCA Bahati Cathedral Development Fund. Help us raise KES 5,000,000 for sanctuary improvements, fellowship hall, ministry growth, and grounds.",
  openGraph: {
    title: "AIPCA Bahati Harambee 2026",
    description:
      "Tujenge Pamoja — Building our house of worship together. Give via M-Pesa.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-body bg-cream text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
