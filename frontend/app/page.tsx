"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAgent, useCopilotKit, useDefaultRenderTool, useRenderToolCall } from "@copilotkit/react-core/v2";
import {
  ResearchState,
  INITIAL_STATE,
  Todo,
  ResearchFile,
} from "@/types/research";
import { ToolCard } from "@/components/ToolCard";
import { FileViewerModal } from "@/components/FileViewerModal";
import { SourceBanner } from "@/components/Thread/SourceBanner";
import { TabBar, type TabId } from "@/components/Thread/TabBar";
import { StepTracker, type Step } from "@/components/Thread/StepTracker";
import { AnswerBody } from "@/components/Thread/AnswerBody";
import { FollowUpInput } from "@/components/Thread/FollowUpInput";
import { LinksTab } from "@/components/Thread/LinksTab";
import { useThread } from "@/components/ThreadContext";
import { Search } from "lucide-react";

function normalizeResult(result: unknown): unknown {
  if (
    result &&
    typeof result === "object" &&
    "type" in result &&
    "text" in result
  ) {
    const wrapped = result as { text: string };
    try {
      return JSON.parse(wrapped.text);
    } catch {
      return wrapped.text;
    }
  }
  return result;
}

export default function Page() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1a1a1a]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center mb-4">
            <Search size={24} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">
            What do you want to research?
          </h1>
          <p className="text-gray-500 text-sm text-center max-w-md">
            Ask any question and I&apos;ll do deep research using web search
            to find the most relevant and up-to-date information.
          </p>
        </div>
      </div>
    );
  }

  return <ResearchPage />;
}

function ResearchPage() {
  const [researchState, setResearchState] = useState<ResearchState>(INITIAL_STATE);
  const [selectedFile, setSelectedFile] = useState<ResearchFile | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("answer");
  const [query, setQuery] = useState("");
  const [localSteps, setLocalSteps] = useState<Step[]>([]);

  const { agent } = useAgent({ agentId: "research_assistant" });
  const { copilotkit } = useCopilotKit();
  const renderToolCall = useRenderToolCall();
  const { threadVersion } = useThread();

  // Reset all local state when a new thread is started
  useEffect(() => {
    if (threadVersion === 0) return; // skip initial mount
    setResearchState(INITIAL_STATE);
    setSelectedFile(null);
    setActiveTab("answer");
    setQuery("");
    setLocalSteps([]);
    
    // Explicitly reset agent messages to clear the chat view immediately
    agent.setMessages([]);
  }, [threadVersion, agent]);

  // Ref for file click handler — used inside stable useDefaultRenderTool callback
  const fileClickRef = useRef<(path: string) => void>(() => {});

  // Track research state from tool calls using v2 useDefaultRenderTool
  useDefaultRenderTool(
    {
      render: ({ name, status, parameters, result }) => {
        const args = (parameters ?? {}) as Record<string, unknown>;
        const isActive = status === "inProgress" || status === "executing";

        // Update step tracker from update_step tool lifecycle
        if (name === "update_step") {
          const stepIndex = args?.step_index as number | undefined;
          if (stepIndex !== undefined) {
            queueMicrotask(() =>
              setLocalSteps((prev) =>
                prev.map((s, i) =>
                  i === stepIndex
                    ? { ...s, status: isActive ? "running" : ("done" as const) }
                    : s,
                ),
              ),
            );
          }
          return <></>;
        }

        // Update research state when tools complete
        if (status === "complete") {
          if (name === "research" && result) {
            const unwrapped = normalizeResult(result);
            const researchResult = unwrapped as {
              summary: string;
              sources: Array<{
                url: string;
                title: string;
                content?: string;
                status: "found" | "scraped" | "failed";
              }>;
            };
            if (researchResult.sources && researchResult.sources.length > 0) {
              queueMicrotask(() =>
                setResearchState((prev) => ({
                  ...prev,
                  sources: [...prev.sources, ...researchResult.sources],
                })),
              );
            }
          }

          if (name === "write_todos" && args?.todos) {
            const todosWithIds = (
              args.todos as Array<{
                id?: string;
                content: string;
                status: string;
              }>
            ).map((todo, index) => ({
              ...todo,
              id: todo.id || `todo-${Date.now()}-${index}`,
            }));
            queueMicrotask(() => {
              setResearchState((prev) => ({
                ...prev,
                todos: todosWithIds as Todo[],
              }));
              setLocalSteps(
                todosWithIds.map((todo, index) => ({
                  id: index,
                  content: todo.content,
                  status: "pending" as const,
                })),
              );
            });
          }

          if (name === "write_file" && args?.file_path) {
            queueMicrotask(() => {
              setResearchState((prev) => ({
                ...prev,
                files: [
                  ...prev.files,
                  {
                    path: args.file_path as string,
                    content: args.content as string,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }));
            });
          }
        }

        return (
          <ToolCard
            name={name}
            status={isActive ? "inProgress" : "complete"}
            args={args}
            result={status === "complete" ? result : undefined}
            onFileClick={(path) => fileClickRef.current(path)}
          />
        );
      },
    },
    [],
  );

  const completedCount = researchState.todos.filter(
    (t) => t.status === "completed",
  ).length;
  const totalCount = researchState.todos.length;
  const isResearchComplete = completedCount === totalCount && totalCount > 0;

  // Step progress from local state (populated by write_todos + update_step events)
  const trackerSteps = localSteps;
  const trackerActiveIndex = localSteps.findIndex((s) => s.status === "running");

  const lastUserMessage = (() => {
    const lastUser = [...agent.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return "";
    if (typeof lastUser.content === "string") return lastUser.content;
    return "";
  })();

  const handleSend = useCallback(
    async (message: string) => {
      setQuery(message);
      setLocalSteps([]);
      agent.addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: message,
      });
      await copilotkit.runAgent({ agent });
    },
    [agent, copilotkit],
  );

  const handleFileClick = useCallback(
    (filePath: string) => {
      // Look up by exact path or by matching the filename portion
      const file = researchState.files.find(
        (f) => f.path === filePath || f.path.endsWith(filePath) || filePath.endsWith(f.path)
      );
      if (file) {
        setSelectedFile(file);
      } else {
        // File not found in tracked state — show a transient toast
        const toast = document.createElement("div");
        toast.className =
          "fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] bg-red-600/90 text-white text-sm px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm border border-red-500/30 transition-opacity duration-300";
        toast.textContent = `Không tìm thấy tệp: ${filePath}`;
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = "0";
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }
    },
    [researchState.files],
  );

  // Keep ref in sync for the stable useDefaultRenderTool callback
  useEffect(() => {
    fileClickRef.current = handleFileClick;
  }, [handleFileClick]);

  const hasActivity = agent.messages.length > 0;

  // Extract text from v2 message content (can be string or content blocks)
  function extractText(content: unknown): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .filter((block): block is { type: "text"; text: string } => block?.type === "text")
        .map((block) => block.text)
        .join("\n");
    }
    return "";
  }

  // Render a single message
  const renderMessage = (msg: (typeof agent.messages)[number], index: number) => {
    const text = extractText(msg.content);

    // User message
    if (msg.role === "user") {
      return (
        <div key={msg.id ?? index} className="flex justify-end mb-6">
          <div className="max-w-[85%] bg-blue-600/20 border border-blue-500/20 rounded-2xl rounded-br-sm px-4 py-2.5">
            <p className="text-sm text-gray-100">{text}</p>
          </div>
        </div>
      );
    }

    // Assistant message — render both text AND tool calls
    if (msg.role === "assistant") {
      const toolCalls = (msg as { toolCalls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> }).toolCalls;
      const hasText = !!text;
      const hasToolCalls = toolCalls && toolCalls.length > 0;

      if (!hasText && !hasToolCalls) return null;

      return (
        <div key={msg.id ?? index} className="mb-4">
          {hasText && <AnswerBody content={text} onFileClick={handleFileClick} />}
          {hasToolCalls && toolCalls.map((toolCall) => {
            const toolMessage = agent.messages.find(
              (m): m is typeof m & { role: "tool"; toolCallId: string; content: string } =>
                m.role === "tool" && "toolCallId" in m && (m as { toolCallId?: string }).toolCallId === toolCall.id
            );
            return (
              <div key={toolCall.id}>
                {renderToolCall({ toolCall, toolMessage })}
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[700px] mx-auto px-4 py-6">
          {!hasActivity ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center mb-4">
                <Search size={24} className="text-blue-400" />
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">
                What do you want to research?
              </h1>
              <p className="text-gray-500 text-sm text-center max-w-md">
                Ask any question and I&apos;ll do deep research using web search
                to find the most relevant and up-to-date information.
              </p>
            </div>
          ) : (
            <>
              <SourceBanner query={query || lastUserMessage} />

              <StepTracker
                steps={trackerSteps}
                activeIndex={trackerActiveIndex}
                isAgentRunning={agent.isRunning}
              />

              {isResearchComplete && (
                <p className="text-xs text-green-400 mb-4 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Research complete
                </p>
              )}

              <TabBar active={activeTab} onTabChange={setActiveTab} />

              {activeTab === "answer" && (
                <div>
                  {agent.messages.map(renderMessage)}
                  {agent.isRunning && !agent.messages.some((m) => m.role === "assistant") && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      Researching...
                    </div>
                  )}
                </div>
              )}

              {activeTab === "links" && (
                <LinksTab sources={researchState.sources} />
              )}
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-[#1a1a1a]">
        <div className="max-w-[700px] mx-auto px-4 py-4">
          <FollowUpInput onSend={handleSend} isLoading={agent.isRunning} />
        </div>
      </div>

      <FileViewerModal
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
      />
    </div>
  );
}
