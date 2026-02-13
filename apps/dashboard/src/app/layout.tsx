import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "./sidebar";

export const metadata: Metadata = {
  title: "Agentic Reviewer — Dashboard",
  description: "Admin dashboard for the autonomous product review pipeline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-8 overflow-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
