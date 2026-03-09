import type { Metadata } from "next";
import { Inter, Geist, Geist_Mono, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { CreateGameProvider } from "@/lib/create-game-context.js";
import { CreateGameModal } from "@/components/create-game-modal.js";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  weight: "400",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Campus San Andrés — Vibe Coding",
  description: "Plataforma de fundraising gamificado para St. Andrew's Scots School",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${inter.variable} ${bebasNeue.variable} ${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <CreateGameProvider>
          {children}
          <CreateGameModal />
        </CreateGameProvider>
      </body>
    </html>
  );
}
