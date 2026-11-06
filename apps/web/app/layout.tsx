import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./context/auth-context";
import { PinPromptProvider } from "./components/PinPrompt";
import { A11yProvider } from "./context/a11y-context";
import { PREPAINT_SCRIPT } from "./lib/a11y";

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
    // The inline script applies saved accessibility settings to <html> before
    // first paint, so its attributes differ from the server render on purpose.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
      </head>
      <body className="bg-[#d4dfea] antialiased">
        <A11yProvider>
          <AuthProvider>
            <PinPromptProvider>{children}</PinPromptProvider>
          </AuthProvider>
        </A11yProvider>
      </body>
    </html>
  );
}
