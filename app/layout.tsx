import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perfilab",
  description: "Análise de perfis do Instagram com dados oficiais da Meta e IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="glow min-h-screen">
        <div className="relative z-10">
          <Nav />
          <div className="pb-24 md:pb-0">{children}</div>
        </div>
      </body>
    </html>
  );
}
