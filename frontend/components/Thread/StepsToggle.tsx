"use client";

import { useState } from "react";
import { ChevronRight, Check, CircleDot, Circle } from "lucide-react";
import type { Todo } from "@/types/research";

interface StepsToggleProps {
  todos: Todo[];
  completedCount: number;
  totalCount: number;
}

export function StepsToggle({ todos, completedCount, totalCount }: StepsToggleProps) {
  const [expanded, setExpanded] = useState(false);

  if (totalCount === 0) return null;

  const allComplete = completedCount === totalCount;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-sm text-gray-400 mb-4 hover:text-white transition-colors duration-150"
      >
        {allComplete ? (
          <Check size={14} className="text-green-400" />
        ) : (
          <CircleDot size={14} className="text-blue-400" />
        )}
        <span>
          {allComplete
            ? `Completed all ${totalCount} steps`
            : `Completed ${completedCount} of ${totalCount} steps`}
        </span>
        <ChevronRight
          size={14}
          className={`transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {expanded && (
        <div className="space-y-1 mb-4 animate-fadeSlideIn">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-start gap-2 text-sm px-2 py-1 rounded-md hover:bg-white/5"
            >
              <span className="mt-0.5 shrink-0">
                {todo.status === "completed" ? (
                  <Check size={14} className="text-green-400" />
                ) : todo.status === "in_progress" ? (
                  <CircleDot size={14} className="text-blue-400 animate-pulse" />
                ) : (
                  <Circle size={14} className="text-gray-500" />
                )}
              </span>
              <span
                className={
                  todo.status === "completed"
                    ? "line-through text-gray-500"
                    : "text-gray-300"
                }
              >
                {todo.content}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
