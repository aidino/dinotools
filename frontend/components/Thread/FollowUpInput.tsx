"use client";

import { useState, type FormEvent } from "react";
import { Plus, ArrowUp } from "lucide-react";

interface FollowUpInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
}

export function FollowUpInput({ onSend, isLoading }: FollowUpInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-[#232323] px-4 py-3 flex items-center gap-2 mt-8"
    >
      <Plus size={18} className="text-gray-400 shrink-0" />
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask a follow-up"
        className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
        disabled={isLoading}
      />
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-white text-black rounded-full p-1.5 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-150"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </form>
  );
}
