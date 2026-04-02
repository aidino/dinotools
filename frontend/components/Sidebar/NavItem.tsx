"use client";

import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  bright?: boolean;
}

export function NavItem({ icon: Icon, label, active, onClick, bright }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm
        transition-colors duration-150
        ${active ? "bg-white/10 text-gray-200" : bright ? "text-white hover:bg-white/10" : "text-gray-400 hover:bg-white/10 hover:text-gray-200"}
      `}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}
