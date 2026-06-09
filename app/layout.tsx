import type { Metadata } from "next";
import { Montserrat, Karla, Playfair_Display } from "next/font/google";
import "./globals.css";
import Nav from "@/components/shared/Nav";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const montserrat = Montserrat({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const karla = Karla({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Maddy & Ricky",
  description: "Our shared dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${montserrat.variable} ${karla.variable}`}>
      <body className="bg-[#edeae4] text-[#1a1a18] min-h-screen">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
