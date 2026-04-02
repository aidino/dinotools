"use client";

import { useSyncExternalStore, useState, useEffect, useCallback, useRef } from "react";
import { useAgent, UseAgentUpdate, useCopilotKit, useDefaultRenderTool, useRenderToolCall } from "@copilotkit/react-core/v2";
import {
  ResearchState,
  INITIAL_STATE,
  Todo,
  ResearchFile,
  Step,
  AgentState,
} from "@/types/research";
import { ToolCard } from "@/components/ToolCard";
import { FileViewerModal } from "@/components/FileViewerModal";
import { SourceBanner } from "@/components/Thread/SourceBanner";
import { TabBar, type TabId } from "@/components/Thread/TabBar";
import { AnswerBody } from "@/components/Thread/AnswerBody";
import { FollowUpInput } from "@/components/Thread/FollowUpInput";
import { LinksTab } from "@/components/Thread/LinksTab";
import { useThread } from "@/components/ThreadContext";
import { Search, Check, Loader2, Circle } from "lucide-react";

// TaskProgress component - displays research progress with real-time updates
function TaskProgress({ steps, activeIndex }: { steps: Step[]; activeIndex: number }) {
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progressPercentage = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div className="flex justify-center w-full px-4 my-4">
      <div className="relative rounded-xl w-full max-w-[700px] p-5 bg-[#232323] border border-white/10 shadow-lg">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">
              Research Progress
            </h3>
            <div className="text-sm text-gray-400">
              {completedCount}/{steps.length} Complete
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 rounded-full overflow-hidden bg-gray-700">
            <div
              className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {steps.map((step, index) => {
            const isCompleted = step.status === "completed";
            const isRunning = index === activeIndex;

            return (
              <div
                key={index}
                className={`relative flex items-center p-2.5 rounded-lg transition-all duration-500 ${
                  isCompleted
                    ? "bg-green-500/10 border border-green-500/20"
                    : isRunning
                      ? "bg-blue-500/10 border border-blue-500/30"
                      : "bg-gray-800/50 border border-white/5"
                }`}
              >
                {/* Status Icon */}
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isRunning
                        ? "bg-blue-500 text-white animate-pulse"
                        : "bg-gray-600 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : isRunning ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Circle size={14} />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium transition-all duration-300 text-sm ${
                      isCompleted
                        ? "text-green-400 line-through"
                        : isRunning
                          ? "text-white"
                          : "text-gray-400"
                    }`}
                  >
                    {step.description}
                  </div>
                  {isRunning && (
                    <div className="text-xs mt-0.5 text-blue-400 animate-pulse">
                      Processing...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

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

function ResearchPage() {
  const [researchState, setResearchState] = useState<ResearchState>(INITIAL_STATE);
  const [selectedFile, setSelectedFile] = useState<ResearchFile | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("answer");
  const [query, setQuery] = useState("");

  // useAgent with OnStateChanged for real-time progress updates
  const { agent } = useAgent({
    agentId: "research_assistant",
    updates: [UseAgentUpdate.OnStateChanged],
  });

  const agentState = agent.state as AgentState | undefined;
  const steps = agentState?.steps || [];
  const activeStepIndex = agentState?.active_step_index ?? -1;

  const { copilotkit } = useCopilotKit();
  const renderToolCall = useRenderToolCall();
  const { registerResetCallback } = useThread();

  // Register reset callback
  useEffect(() => {
    const unregister = registerResetCallback(() => {
      setResearchState(INITIAL_STATE);
      setSelectedFile(null);
      setActiveTab("answer");
      setQuery("");
      agent.setMessages([]);
    });
    return unregister;
  }, [registerResetCallback, agent]);

  // Ref for file click handler
  const fileClickRef = useRef<(path: string) => void>(() => {});

  // Track research state from tool calls
  useDefaultRenderTool(
    {
      render: ({ name, status, parameters, result }) => {
        const args = (parameters ?? {}) as Record<string, unknown>;
        const isActive = status === "inProgress" || status === "executing";

        // Handle write_todos for research state (not step tracking)
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
            setResearchState((prev) => {
              const hasTheseTodos = prev.todos.length === todosWithIds.length &&
                todosWithIds.every((t, i) => prev.todos[i]?.content === t.content);
              if (hasTheseTodos) return prev;
              return { ...prev, todos: todosWithIds as Todo[] };
            });
          });
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
              queueMicrotask(() => {
                setResearchState((prev) => ({
                  ...prev,
                  sources: [...prev.sources, ...researchResult.sources],
                }));
              });
            }
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
            todos={researchState.todos}
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

  const lastUserMessage = (() => {
    const lastUser = [...agent.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return "";
    if (typeof lastUser.content === "string") return lastUser.content;
    return "";
  })();

  const handleSend = useCallback(
    async (message: string) => {
      setQuery(message);
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
      const file = researchState.files.find(
        (f) => f.path === filePath || f.path.endsWith(filePath) || filePath.endsWith(f.path)
      );
      if (file) {
        setSelectedFile(file);
      } else {
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

  useEffect(() => {
    fileClickRef.current = handleFileClick;
  }, [handleFileClick]);

  const hasActivity = agent.messages.length > 0;

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

  const renderMessage = (msg: (typeof agent.messages)[number], index: number) => {
    const text = extractText(msg.content);

    if (msg.role === "user") {
      return (
        <div key={msg.id ?? index} className="flex justify-end mb-6">
          <div className="max-w-[85%] bg-blue-600/20 border border-blue-500/20 rounded-2xl rounded-br-sm px-4 py-2.5">
            <p className="text-sm text-gray-100">{text}</p>
          </div>
        </div>
      );
    }

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

              {/* TaskProgress via useAgent state */}
              {steps.length > 0 && (
                <TaskProgress steps={steps} activeIndex={activeStepIndex} />
              )}

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

// Keep Page component with useSyncExternalStore
export default function Page() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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
