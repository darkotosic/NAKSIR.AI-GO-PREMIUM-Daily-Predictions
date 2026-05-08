import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAKSIR Store",
  description: "Premium prodavnica sa brzom potvrdom porudžbine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr-Latn">
      <body>
        <div className="topbar"><div className="container">Plaćanje pouzećem · Zamena veličine · Brza potvrda</div></div>
        <header className="header"><nav className="container nav"><Link href="/" className="brand">NAKSIR STORE</Link><div className="navlinks"><Link href="/products">Proizvodi</Link><Link href="/cart">Korpa</Link></div></nav></header>
        {children}
      </body>
    </html>
  );
}
