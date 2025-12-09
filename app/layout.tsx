import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "../components/AuthProvider";

export const metadata: Metadata = {
  title: "MailCoach AI",
  description: "Assistant IA pour rédiger des e-mails pro en quelques secondes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-slate-950 text-slate-100">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
