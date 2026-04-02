"use client";

import { useState } from "react";
import {
  ChevronDown,
  Pencil,
  ClipboardList,
  Search,
  Save,
  BookOpen,
  Check,
  Eye,
} from "lucide-react";

interface ToolCardProps {
  name: string;
  status: "inProgress" | "executing" | "complete";
  args: Record<string, unknown>;
  result?: unknown;
  onFileClick?: (filePath: string) => void;
}

function normalizeResult(result: unknown): unknown {
  if (
    result &&
    typeof result === "object" &&
    "type" in result &&
    "text" in result
  ) {
    const wrapped = result as { type: string; text: string };
    try {
      return JSON.parse(wrapped.text);
    } catch {
      return wrapped.text;
    }
  }
  return result;
}

function safeText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const TOOL_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{
      size?: number;
      strokeWidth?: number;
      className?: string;
    }>;
    getDisplayText: (args: Record<string, unknown>) => string;
    getResultSummary?: (
      result: unknown,
      args: Record<string, unknown>,
    ) => string | null;
  }
> = {
  write_todos: {
    icon: Pencil,
    getDisplayText: () => "Updating research plan...",
    getResultSummary: (result, args) => {
      const todos = (args as { todos?: unknown[] })?.todos;
      if (Array.isArray(todos)) {
        return `${todos.length} todo${todos.length !== 1 ? "s" : ""} updated`;
      }
      return null;
    },
  },
  read_todos: {
    icon: ClipboardList,
    getDisplayText: () => "Checking research plan...",
    getResultSummary: (result) => {
      const todos = (result as { todos?: unknown[] })?.todos;
      if (Array.isArray(todos)) {
        return `${todos.length} todo${todos.length !== 1 ? "s" : ""} found`;
      }
      return null;
    },
  },
  research: {
    icon: Search,
    getDisplayText: (args) =>
      `Researching: ${((args.query as string) || "...").slice(0, 50)}${(args.query as string)?.length > 50 ? "..." : ""}`,
    getResultSummary: (result) => {
      if (result && typeof result === "object" && "sources" in result) {
        const { sources } = result as { summary: string; sources: unknown[] };
        return `Found ${sources.length} source${sources.length !== 1 ? "s" : ""}`;
      }
      return "Research complete";
    },
  },
  write_file: {
    icon: Save,
    getDisplayText: (args) => {
      const path = args.path as string | undefined;
      const filename =
        path?.split("/").pop() || (args.filename as string | undefined);
      return `Writing: ${filename || "file"}`;
    },
    getResultSummary: (_result, args) => {
      const content = args.content as string | undefined;
      if (content) {
        const firstLine = content.split("\n")[0].slice(0, 50);
        return firstLine + (content.length > 50 ? "..." : "");
      }
      return "File written";
    },
  },
  read_file: {
    icon: BookOpen,
    getDisplayText: (args) => {
      const path = args.path as string | undefined;
      const filename =
        path?.split("/").pop() || (args.filename as string | undefined);
      return `Reading: ${filename || "file"}`;
    },
    getResultSummary: (result) => {
      const content = (result as { content?: string })?.content;
      if (content && typeof content === "string") {
        const preview = content.slice(0, 50);
        return preview + (content.length > 50 ? "..." : "");
      }
      return null;
    },
  },
};

export function ToolCard({ name, status, args, result, onFileClick }: ToolCardProps) {
  const config = TOOL_CONFIG[name];

  if (config) {
    return (
      <SpecializedToolCard
        name={name}
        status={status}
        args={args}
        result={result}
        config={config}
        onFileClick={onFileClick}
      />
    );
  }

  return (
    <DefaultToolCard name={name} status={status} args={args} result={result} />
  );
}

interface SpecializedToolCardProps extends ToolCardProps {
  config: {
    icon: React.ComponentType<{
      size?: number;
      strokeWidth?: number;
      className?: string;
    }>;
    getDisplayText: (args: Record<string, unknown>) => string;
    getResultSummary?: (
      result: unknown,
      args: Record<string, unknown>,
    ) => string | null;
  };
  onFileClick?: (filePath: string) => void;
}

function SpecializedToolCard({
  name,
  status,
  args,
  result,
  config,
  onFileClick,
}: SpecializedToolCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isComplete = status === "complete";
  const isExecuting = status === "inProgress" || status === "executing";

  const normalizedResult = normalizeResult(result);

  const resultSummary =
    isComplete && config.getResultSummary
      ? config.getResultSummary(normalizedResult, args)
      : null;

  const hasExpandableContent =
    isComplete && (name === "research" || name === "write_todos");

  // For write_file, show "View Report" button when complete
  const isFileWriteComplete = isComplete && name === "write_file";
  const filePath = (args.file_path as string) || (args.path as string) || "";

  return (
    <div
      className={`
        rounded-lg border border-white/10 bg-[#232323]/80 p-4 mb-2
        transition-all duration-200
        ${hasExpandableContent ? "cursor-pointer hover:border-white/20" : ""}
        ${isComplete ? "opacity-80" : ""}
      `}
      onClick={hasExpandableContent ? () => setExpanded(!expanded) : undefined}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: isComplete
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(59, 130, 246, 0.1)",
          }}
        >
          {isComplete ? (
            <Check size={16} strokeWidth={2} className="text-green-400" />
          ) : (
            <config.icon
              size={16}
              strokeWidth={2}
              className={`${isExecuting ? "animate-spin-slow" : ""} text-blue-400`}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${isComplete ? "text-gray-400" : "text-gray-200"}`}
          >
            {config.getDisplayText(args)}
          </p>
          {resultSummary && (
            <p className="text-xs mt-0.5 text-green-400">{resultSummary}</p>
          )}
        </div>
        {isFileWriteComplete && onFileClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileClick(filePath);
            }}
            className="
              flex items-center gap-1.5 px-3 py-1.5
              bg-blue-600/20 hover:bg-blue-600/30
              border border-blue-500/30 hover:border-blue-400/50
              rounded-lg text-xs font-medium text-blue-300 hover:text-blue-200
              transition-all duration-200 shrink-0
            "
          >
            <Eye size={13} />
            Xem báo cáo
          </button>
        )}
        {hasExpandableContent && (
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        )}
      </div>

      {expanded && isComplete && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <ExpandedDetails name={name} result={normalizedResult} args={args} />
        </div>
      )}
    </div>
  );
}

function ExpandedDetails({
  name,
  result,
  args,
}: {
  name: string;
  result: unknown;
  args: Record<string, unknown>;
}) {
  if (name === "research") {
    const summary =
      typeof result === "object" && result && "summary" in result
        ? safeText((result as { summary: unknown }).summary)
        : typeof result === "string"
          ? result
          : safeText(result);
    if (!summary)
      return <p className="text-xs text-gray-500">No findings</p>;
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500">Query:</p>
        <p className="text-xs text-gray-400">{safeText(args.query) || "..."}</p>
        <p className="text-xs font-medium text-gray-500 mt-2">Findings:</p>
        <p className="text-sm text-gray-200 whitespace-pre-wrap">{summary}</p>
      </div>
    );
  }

  if (name === "write_todos") {
    const todos = (
      args as { todos?: Array<{ id: string; content: string; status: string }> }
    )?.todos;
    if (!todos?.length)
      return <p className="text-xs text-gray-500">No todos</p>;
    return (
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {todos.map((todo, i) => (
          <div key={todo.id || i} className="flex items-start gap-2 text-xs">
            <span
              className="mt-0.5"
              style={{
                color:
                  todo.status === "completed"
                    ? "#22c55e"
                    : todo.status === "in_progress"
                      ? "#3b82f6"
                      : "#6b7280",
              }}
            >
              {todo.status === "completed"
                ? "✓"
                : todo.status === "in_progress"
                  ? "●"
                  : "○"}
            </span>
            <span
              className={
                todo.status === "completed"
                  ? "line-through text-gray-500"
                  : "text-gray-300"
              }
            >
              {safeText(todo.content)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="text-xs bg-[#1a1a1a] p-3 rounded-lg overflow-auto max-h-32 border border-white/5 text-gray-400">
      {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
    </pre>
  );
}

function DefaultToolCard({ name, status, args, result }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isComplete = status === "complete";

  return (
    <div className="rounded-lg border border-white/10 bg-[#232323]/80 p-3 my-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`
              w-8 h-8 rounded-lg flex items-center justify-center text-sm
              ${isComplete ? "bg-green-500/10" : "bg-blue-500/10"}
            `}
          >
            {isComplete ? "✓" : "⚙️"}
          </div>
          <div className="flex items-center gap-2">
            <code className="text-sm text-gray-200">{name}</code>
            <span
              className={`
                text-xs px-2 py-0.5 rounded-full
                ${isComplete ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}
              `}
            >
              {status}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {expanded && (
        <div className="mt-3 space-y-2">
          <div>
            <p className="text-xs text-gray-500 mb-1">Arguments:</p>
            <pre className="text-xs bg-[#1a1a1a] p-3 rounded-lg overflow-auto max-h-32 border border-white/5 text-gray-400">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
          {result !== undefined && result !== null && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Result:</p>
              <pre className="text-xs bg-[#1a1a1a] p-3 rounded-lg overflow-auto max-h-32 border border-white/5 text-gray-400">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
