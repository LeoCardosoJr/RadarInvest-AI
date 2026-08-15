import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "RadarInvest AI",
  description: "Notícias financeiras resumidas de acordo com seus interesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
