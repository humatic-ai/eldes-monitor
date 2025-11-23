import type { Metadata } from "next";
import "./globals.css";
import Header from "./header";
import Footer from "./footer";
import { Toaster } from "react-hot-toast";
import { ConfirmDialogProvider } from "./components/ConfirmDialogProvider";

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
        <ConfirmDialogProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: "#1a1a1a",
              color: "#f0f0f0",
              border: "1px solid #2c2c2c",
              borderRadius: "12px",
              padding: "12px 16px",
            },
            success: {
              iconTheme: {
                primary: "#30d158",
                secondary: "#1a1a1a",
              },
            },
            error: {
              iconTheme: {
                primary: "#ff453a",
                secondary: "#1a1a1a",
              },
            },
          }}
        />
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}

