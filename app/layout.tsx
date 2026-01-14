import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
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
      <head>
        {/* Google Ads / Google Tag */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17848732127"
          strategy="afterInteractive"
        />
        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17848732127');
          `}
        </Script>
      </head>

      <body className="bg-slate-950 text-slate-100">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
