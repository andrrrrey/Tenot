import "./globals.css";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthProvider } from "@/components/AuthProvider";
import ChatWidget from "@/components/ChatWidget";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const metadata: Metadata = {
  title: "Tenot — объявления без лишнего",
  description: "Tenot — MVP сайта объявлений. Найди, продай, договорись.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <SiteHeader />
            <main className="container main-content" style={{ flex: 1 }}>
              {children}
            </main>
            <SiteFooter />
          </div>
          <ChatWidget />
          <MobileBottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
