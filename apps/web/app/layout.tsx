import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./context/auth-context";

export const metadata: Metadata = {
  title: "State Bank of India - Retail Internet Banking System",
  description: "Secure Core Banking & NetBanking Portal. Online SBI / Bharat National Bank account services, fund transfers, e-deposits, and statements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#d4dfea] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
