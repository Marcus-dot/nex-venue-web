import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ThemeProvider } from "@/context/ThemeContext";

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "NexVenue | Your Events, Simplified",
  description: "Experience conferences, expos, and community gatherings like never before. Discover, connect, and stay in the loop with NexVenue.",
};

import SmoothScroll from "@/components/ui/SmoothScroll";
import { Navigation } from "@/components/layout/Navigation";
import { ThemeSync } from "@/components/layout/ThemeSync";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${rubik.variable} font-rubik antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <ThemeSync />
            <ToastProvider>
              <Navigation />
              <SmoothScroll>
                {children}
              </SmoothScroll>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
