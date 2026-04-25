import type { Metadata } from "next";
import "./globals.css";
import { DevDebugPanel } from '@/components/ui/DevDebugPanel';

export const metadata: Metadata = {
  title: "Helm",
  description: "Your travel companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {process.env.NODE_ENV === 'development' && <DevDebugPanel />}
      </body>
    </html>
  );
}
