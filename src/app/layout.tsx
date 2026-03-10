import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NotificationProvider } from "@/components/NotificationProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import StatusBar from "@/components/StatusBar";
import PageTransition from "@/components/PageTransition";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "SupportFlow — Панель поддержки",
  description: "Telegram support panel с CRM, биллингом и AI-ассистентом",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NotificationProvider>
            <LanguageProvider>
              <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                  <PageTransition>
                    {children}
                  </PageTransition>
                </main>
                <StatusBar />
              </div>
            </LanguageProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
