"use client";

import { useState } from "react";
import {
  Search,
  Monitor,
  Plus,
  Clock,
  Compass,
  Layers,
  DollarSign,
  Heart,
  GraduationCap,
  FileText,
  MoreHorizontal,
  Bell,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { HistoryList } from "./HistoryList";

export function Sidebar() {
  const [activeNav, setActiveNav] = useState("search");

  return (
    <aside className="flex flex-col gap-1 h-full w-[148px] px-2 py-3 bg-[#1a1a1a] border-r border-white/10 shrink-0">
      {/* Top section — pinned actions */}
      <NavItem
        icon={Search}
        label="Search"
        active={activeNav === "search"}
        onClick={() => setActiveNav("search")}
      />

      {/* Navigation group */}
      <div className="mt-4 flex flex-col gap-1">
        <NavItem icon={Plus} label="New thread" bright />
        
      </div>

      {/* History section */}
      <div className="mt-4">
        <div className="px-3 mb-1">
          <span className="text-xs text-gray-500">History</span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <HistoryList />
        </div>
      </div>

      {/* Bottom profile */}
      <div className="mt-auto flex items-center gap-2 px-3 py-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shrink-0" />
        <span className="text-sm text-gray-300 truncate">Ngo Hong Thai</span>
        <Bell size={14} className="text-gray-500 ml-auto shrink-0" />
      </div>
    </aside>
  );
}
