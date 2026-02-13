import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

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
            <main className="flex-1 p-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

function Sidebar() {
  return (
    <nav className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-2">
      <h1 className="text-xl font-bold mb-6 text-white">Agentic Reviewer</h1>
      <a href="/" className="px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">
        Pipeline Overview
      </a>
      <a href="/products" className="px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">
        Products
      </a>
      <a href="/videos" className="px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">
        Video Queue
      </a>
    </nav>
  );
}
