import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "DinoTools - Deep Research Assistant",
  description: "AI-powered deep research assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#1a1a1a] text-[#e5e5e5]">
        <Providers>
          <div className="h-screen flex flex-row overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
