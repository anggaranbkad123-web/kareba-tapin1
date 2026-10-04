import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KAREBA — Kamus Rekening Belanja",
  description: "KAREBA — Kamus Rekening Belanja untuk Pemerintah Daerah: Belanja, Pendapatan, dan Pembiayaan. Kenali Rekening, Pahami Belanja. Mengacu pada Permendagri Nomor 90 Tahun 2019.",
  keywords: ["KAREBA", "rekening", "kamus rekening belanja", "chart of accounts", "pemerintah daerah", "belanja", "pendapatan", "pembiayaan"],
  authors: [{ name: "KAREBA" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
