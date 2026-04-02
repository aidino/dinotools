"use client";

import type { LucideIcon } from "lucide-react";
import { FileText, Link2 } from "lucide-react";

export type TabId = "answer" | "links";

interface TabConfig {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const TABS: TabConfig[] = [
  { id: "answer", label: "Answer", icon: FileText },
  { id: "links", label: "Links", icon: Link2 },
];

interface TabBarProps {
  active: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabBar({ active, onTabChange }: TabBarProps) {
  return (
    <div className="flex gap-4 border-b border-white/10 mb-4">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-1.5 text-sm pb-2 border-b-2 transition-colors duration-150
              ${isActive ? "border-white text-white" : "border-transparent text-gray-400 hover:text-white"}
            `}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
