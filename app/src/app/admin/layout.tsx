"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, CalendarDays, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/admin") return;
    if (localStorage.getItem("admin_auth") !== "true") router.replace("/admin");
  }, [pathname, router]);

  function handleLogout() {
    localStorage.removeItem("admin_auth");
    router.push("/admin");
  }

  if (pathname === "/admin") return <>{children}</>;

  const NAV = [
    { href: "/admin/dashboard",  label: "전체 현황",  icon: LayoutDashboard },
    { href: "/admin/challenges", label: "챌린지 관리", icon: CalendarDays },
    { href: "/admin/teams",      label: "팀 관리",    icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 h-14 flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌲</span>
          <span className="font-bold text-gray-900 text-[16px] font-noto">팀 숲 관리자</span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 h-9 rounded-lg text-[14px] transition-colors font-pretendard",
                pathname === href
                  ? "bg-[#31C678]/10 text-[#31C678] font-medium"
                  : "text-gray-500 hover:bg-gray-100"
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[14px] text-gray-400 hover:bg-gray-100 transition-colors font-pretendard"
        >
          <LogOut size={15} />
          로그아웃
        </button>
      </header>

      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
