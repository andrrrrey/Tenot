import "./globals.css";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthProvider } from "@/components/AuthProvider";
import ChatWidget from "@/components/ChatWidget";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MainContent } from "@/components/MainContent";

export const metadata: Metadata = {
  title: "Tenot — объявления без лишнего",
  description: "Tenot — MVP сайта объявлений. Найди, продай, договорись.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AuthProvider>
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <SiteHeader />
            <MainContent>{children}</MainContent>
            <SiteFooter />
          </div>
          <ChatWidget />
          <MobileBottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
