// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MailCoach AI",
  description: "Générateur d’e-mails professionnels avec l’IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="min-h-screen flex items-center justify-center px-4">
          {children}
        </div>
      </body>
    </html>
  );
}
