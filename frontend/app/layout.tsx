import "./globals.css";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthProvider } from "@/components/AuthProvider";
import ChatWidget from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: "Tenot — объявления без лишнего",
  description: "Tenot — MVP сайта объявлений. Найди, продай, договорись.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          <SiteHeader />
          <main className="container" style={{ padding: "18px 16px 40px" }}>
            {children}
          </main>
          <SiteFooter />
          <ChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
