import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { DevAgentation } from "~/components/layout/agentation";
import { GlobalProviders } from "~/providers/global";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "ChaiForm",
  description: "Build smart forms, collect responses, and analyze data with a premium SaaS workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GlobalProviders>
          {children}
          <DevAgentation />
        </GlobalProviders>
      </body>
    </html>
  );
}
