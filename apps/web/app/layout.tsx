import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./context/auth-context";

export const metadata: Metadata = {
  title: "Bharat National Bank - NetBanking",
  description: "Fictional retail bank for a DBMS lab: savings accounts, deposits, withdrawals, loans and credit scores, with all banking logic in PostgreSQL.",
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
