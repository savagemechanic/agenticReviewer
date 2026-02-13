"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Video,
  Compass,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Pipeline Overview", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/videos", label: "Video Queue", icon: Video },
  { href: "/discovery", label: "Discovery", icon: Compass },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-slate-800 rounded-lg text-slate-300"
      >
        {collapsed ? <X size={20} /> : <Menu size={20} />}
      </button>

      <nav
        className={`
          ${collapsed ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          fixed md:relative z-40 w-64 h-screen bg-slate-900 border-r border-slate-800
          p-6 flex flex-col gap-1 transition-transform duration-200
        `}
      >
        <h1 className="text-xl font-bold mb-8 text-white tracking-tight">
          Agentic Reviewer
        </h1>

        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <a
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }
                `}
              >
                <Icon size={18} />
                {item.label}
              </a>
            );
          })}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <div className="px-3 py-2 text-xs text-slate-500">
            v1.0 — AI Pipeline
          </div>
        </div>
      </nav>
    </>
  );
}
