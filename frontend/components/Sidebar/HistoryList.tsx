"use client";

const DEMO_THREADS = [
  "Deep dive into RAG architectures",
  "Comparison of LLM frameworks 2026",
  "React Server Components best practices",
  "Building AI agents with LangGraph",
];

export function HistoryList() {
  return (
    <div className="flex flex-col gap-0.5">
      {DEMO_THREADS.map((title) => (
        <button
          key={title}
          className="truncate text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/10 w-full text-left transition-colors duration-150"
        >
          {title}
        </button>
      ))}
    </div>
  );
}
