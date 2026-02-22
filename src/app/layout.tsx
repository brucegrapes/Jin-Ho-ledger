import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Navigation from "@/components/Navigation";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monark — Secure Financial Dashboard",
  description: "Manage and analyze your bank statements securely",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Navigation />
        {children}
      </body>
    </html>
  );
}
