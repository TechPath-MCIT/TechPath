"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Bot, GraduationCap, LogOut, Map } from "lucide-react";
import type { ReactNode } from "react";

type WorkspaceShellProps = {
  children: ReactNode;
};

const navigation = [
  {
    label: "Landscape",
    href: "/landscape",
    icon: Map,
  },
  {
    label: "Agent",
    href: "/agent",
    icon: Bot,
  },
  {
    label: "Grind",
    href: "/grind",
    icon: GraduationCap,
  },
];

export default function WorkspaceShell({
  children,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
        <Link
          href="/landscape"
          className="text-2xl font-bold"
          style={{
            fontFamily: '"Open Sans", sans-serif',
            background:
              "linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          TechPath
        </Link>

        <nav className="flex items-center gap-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex w-[118px] items-center justify-center gap-2 rounded-lg py-2 transition-colors"
                style={{
                  color: isActive ? "#ffffff" : "#55371e",
                  background: isActive
                    ? "linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)"
                    : "transparent",
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <div
            className="mx-2 h-6 w-px"
            style={{ backgroundColor: "rgba(21, 16, 12, 0.1)" }}
          />

          <button
            type="button"
            onClick={() => {
              void signOut({ redirectUrl: "/sign-in" });
            }}
            className="flex items-center gap-2 rounded-lg px-4 py-2 transition-opacity hover:opacity-70"
            style={{ color: "#55371e" }}
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
}