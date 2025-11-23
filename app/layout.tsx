import type { Metadata } from "next";
import "./globals.css";
import Header from "./header";
import Footer from "./footer";

// Force dynamic rendering to ensure middleware runs
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "ELDES ESIM364 Monitor",
  description: "Monitor and control your ELDES ESIM364 alarm systems",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="min-h-screen">
      <body className="antialiased bg-background text-text-primary flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

