import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Gastroledger - SaaS de Gestión Gastronómica",
  description: "El sistema de gestión POS, inventario y cocina definitivo para restaurantes, cafeterías y pollerías.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${inter.variable} ${sora.variable} antialiased min-h-screen bg-background text-foreground font-[family-name:var(--font-inter)]`}
      >
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" theme="dark" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
