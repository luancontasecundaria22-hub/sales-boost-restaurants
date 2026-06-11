import type { Metadata } from "next";
import { Inter_Tight, Inter } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-inter-tight",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Sales Boost | Plataforma de Crescimento para Restaurantes",
  description: "Transforme mais visitas ao restaurante em receita.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${interTight.variable} ${inter.variable} antialiased bg-white text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
