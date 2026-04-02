"use client";

import { useState, useEffect, useRef } from "react";
import { Check, CircleDot, Circle, ChevronRight } from "lucide-react";

export interface Step {
  id: number;
  content: string;
  status: "pending" | "running" | "done";
}

interface StepTrackerProps {
  steps: Step[];
  activeIndex: number;
  isAgentRunning: boolean;
}

export function StepTracker({ steps, activeIndex, isAgentRunning }: StepTrackerProps) {
  const [expanded, setExpanded] = useState(true);
  const prevExpandedRef = useRef(true);

  // Auto-expand when a step starts running
  useEffect(() => {
    if (activeIndex >= 0 && !prevExpandedRef.current) {
      setExpanded(true);
    }
    prevExpandedRef.current = expanded;
  }, [activeIndex, expanded]);

  // Auto-collapse when all steps are done
  useEffect(() => {
    if (
      steps.length > 0 &&
      steps.every((s) => s.status === "done") &&
      !isAgentRunning
    ) {
      setExpanded(false);
    }
  }, [steps, isAgentRunning]);

  if (steps.length === 0) return null;

  const completedCount = steps.filter((s) => s.status === "done").length;
  const totalCount = steps.length;
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
            : `Step ${completedCount + 1} of ${totalCount}`}
        </span>
        <ChevronRight
          size={14}
          className={`transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {expanded && (
        <div className="space-y-1 mb-4 animate-fadeSlideIn">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-start gap-2 text-sm px-2 py-1 rounded-md hover:bg-white/5"
            >
              <span className="mt-0.5 shrink-0">
                {step.status === "done" ? (
                  <Check size={14} className="text-green-400" />
                ) : step.status === "running" ? (
                  <CircleDot size={14} className="text-blue-400 animate-pulse" />
                ) : (
                  <Circle size={14} className="text-gray-500" />
                )}
              </span>
              <span
                className={
                  step.status === "done"
                    ? "line-through text-gray-500"
                    : step.status === "running"
                      ? "text-white font-medium"
                      : "text-gray-300"
                }
              >
                {step.content}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
