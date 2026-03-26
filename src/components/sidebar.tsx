"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  Activity,
  Webhook,
  LogOut,
  CheckCircle,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";

interface SidebarProps {
  user: AuthUser;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["submitter", "approver", "school_admin", "platform_admin"] },
  { href: "/submissions", label: "Submissions", icon: FileText, roles: ["submitter", "approver", "school_admin", "platform_admin"] },
  { href: "/admin/workflows", label: "Workflows", icon: GitBranch, roles: ["school_admin", "platform_admin"] },
  { href: "/admin/audit", label: "Audit Trail", icon: Activity, roles: ["school_admin", "platform_admin"] },
  { href: "/admin/webhooks", label: "Webhooks", icon: Webhook, roles: ["school_admin", "platform_admin"] },
];

export function AppSidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role)
  );

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <aside className="w-[260px] h-full bg-white border-r border-approve-border flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-approve-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-approve-primary rounded-[10px] flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold">
            Approve<span className="text-approve-primary">SG</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-colors ${
                isActive
                  ? "bg-approve-primary-light text-approve-primary"
                  : "text-approve-text-secondary hover:bg-approve-surface-alt hover:text-approve-text"
              }`}
            >
              <item.icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-approve-border">
        <div className="px-3 mb-3">
          <p className="text-sm font-semibold text-approve-text truncate">{user.name}</p>
          <p className="text-xs text-approve-text-secondary truncate">{user.email}</p>
          <p className="text-xs text-approve-text-secondary mt-0.5">
            School {user.schoolCode} · {user.role.replace("_", " ")}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-btn text-sm text-approve-text-secondary hover:bg-approve-surface-alt hover:text-approve-text transition-colors w-full"
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
