import type { Metadata } from "next";
import "@fontsource/geist";
import "@fontsource/geist/400.css";
import "@fontsource/geist-mono";
import "@fontsource/geist-mono/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skolkarta - Swedish School Merit Visualizer",
  description: "Interactive map of 6,500+ Swedish schools with performance data from Skolverket. Compare grundskola merit values, grade 6 test scores, and gymnasium statistics.",
  alternates: {
    canonical: 'https://skolkarta.albertoprietolofkrantz.dev',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
