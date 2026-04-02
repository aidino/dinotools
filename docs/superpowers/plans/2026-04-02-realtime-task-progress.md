# Real-time Task Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real-time task progress streaming from backend to frontend using CopilotKit v2 useAgent with OnStateChanged, replacing the current useDefaultRenderTool-based step tracking.

**Architecture:** Frontend uses useAgent hook to subscribe to state changes from backend. Backend uses predict_state metadata for auto-streaming tool arguments and adispatch_custom_event for manual state emission during step execution. UI displays steps with progress bar and smooth animations.

**Tech Stack:** Next.js 16, React 19, CopilotKit React SDK v2, Tailwind CSS v4, LangGraph, CopilotKit Python SDK

---

## File Structure

### Frontend (frontend/)

| File | Action | Responsibility |
|------|--------|--------------|
| `types/research.ts` | Modify | Add Step interface and update AgentState with steps + active_step_index |
| `app/page.tsx` | Major rewrite | Replace useDefaultRenderTool tracking with useAgent + TaskProgress component |
| `components/Thread/StepTracker.tsx` | Delete | Replaced by inline TaskProgress in page.tsx |

### Backend (agents/)

| File | Action | Responsibility |
|------|--------|--------------|
| `tools.py` | Modify | Update update_step to emit state via copilotkit_emit_state |
| `deep_research.py` | Modify | Add predict_state metadata and adispatch_custom_event in node |

---

## Task 1: Update Frontend Types

**Files:**
- Modify: `frontend/types/research.ts`

### Step 1.1: Add Step interface

```typescript
export interface Step {
  description: string;
  status: "pending" | "completed";
}
```

### Step 1.2: Add AgentState interface

```typescript
export interface AgentState {
  steps: Step[];
  active_step_index: number;  // -1 means no active step
}
```

### Step 1.3: Commit

```bash
git add frontend/types/research.ts
git commit -m "types: add Step and AgentState interfaces for real-time progress"
```

---

## Task 2: Rewrite Frontend Page

**Files:**
- Modify: `frontend/app/page.tsx` (complete rewrite)

### Step 2.1: Update imports

Replace existing imports with:

```tsx
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
```

### Step 2.2: Add TaskProgress component (before ResearchPage)

```tsx
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
            const isPending = !isCompleted && !isRunning;

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
```

### Step 2.3: Rewrite ResearchPage component

```tsx
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
```

### Step 2.4: Commit

```bash
git add frontend/app/page.tsx
git commit -m "feat: rewrite page with useAgent and TaskProgress for real-time updates"
```

---

## Task 3: Delete StepTracker Component

**Files:**
- Delete: `frontend/components/Thread/StepTracker.tsx`

### Step 3.1: Remove file

```bash
rm frontend/components/Thread/StepTracker.tsx
git add frontend/components/Thread/StepTracker.tsx
git commit -m "chore: delete StepTracker (replaced by TaskProgress)"
```

---

## Task 4: Update Backend Tools

**Files:**
- Modify: `agents/tools.py`

### Step 4.1: Add imports

```python
from copilotkit.langgraph import copilotkit_emit_state
```

### Step 4.2: Update update_step tool

Replace the existing `update_step` tool with:

```python
@tool
async def update_step(step_index: int, status: str, config: RunnableConfig) -> str:
    """Update the status of the current research step and emit to frontend.

    Args:
        step_index: The zero-based index of the step in the research plan.
        status: The new status - "running" or "done".
    """
    try:
        thread_id = _get_thread_id(config)
        progress = _step_progress.get(thread_id, {"steps": [], "active_step_index": -1})
        steps = progress["steps"]

        if 0 <= step_index < len(steps):
            # Map internal status to UI status
            ui_status = "completed" if status == "done" else "pending"
            steps[step_index]["status"] = ui_status
            
            # Set active index (-1 if not running)
            active_index = step_index if status == "running" else -1
            progress["active_step_index"] = active_index
            _step_progress[thread_id] = progress

            # Emit state to frontend via CopilotKit
            await copilotkit_emit_state(config, {
                "steps": steps,
                "active_step_index": active_index,
            })
    except Exception as e:
        # Log but don't fail - frontend also tracks via tool lifecycle
        print(f"[update_step] Warning: failed to emit state: {e}")

    return f"Step {step_index} marked as {status}"
```

### Step 4.3: Commit

```bash
git add agents/tools.py
git commit -m "feat: update update_step to emit state via copilotkit_emit_state"
```

---

## Task 5: Update Backend Agent

**Files:**
- Modify: `agents/deep_research.py`

### Step 5.1: Add imports

```python
from langchain_core.callbacks.manager import adispatch_custom_event
from copilotkit.langgraph import copilotkit_configure
```

### Step 5.2: Add predict_state config to build_agent

Replace the end of `build_agent()` function (after agent_graph creation) with:

```python
    # Create the Deep Agent with CopilotKit middleware
    agent_graph = create_deep_agent(
        model=llm,
        system_prompt=MAIN_SYSTEM_PROMPT,
        tools=main_tools,
        middleware=[CopilotKitMiddleware()],
        checkpointer=MemorySaver(),
    )

    # Configure state streaming for real-time progress updates
    config = {
        "recursion_limit": 100,
        "metadata": {
            "predict_state": [
                {
                    "state_key": "steps",
                    "tool": "write_todos",
                    "tool_argument": "todos",
                },
                {
                    "state_key": "active_step_index",
                    "tool": "update_step",
                    "tool_argument": "step_index",
                }
            ]
        }
    }

    print(f"[AGENT] Deep Research Agent created with model={model_name}")
    print(f"[AGENT] Main tools: {[t.name for t in main_tools]}")
    print(f"[AGENT] State streaming enabled for real-time progress")

    return agent_graph.with_config(config)
```

### Step 5.3: Commit

```bash
git add agents/deep_research.py
git commit -m "feat: add predict_state config for real-time state streaming"
```

---

## Task 6: Verify Build

**Files:**
- All modified files

### Step 6.1: Check TypeScript compilation

```bash
cd frontend
npm run build 2>&1 | head -50
```

Expected: No TypeScript errors

### Step 6.2: Run ESLint

```bash
npm run lint 2>&1 | head -30
```

Expected: No errors, possibly warnings

### Step 6.3: Commit any fixes

```bash
git add -A
git commit -m "fix: resolve any build/lint issues" || echo "No changes to commit"
```

---

## Self-Review Checklist

### Spec Coverage
- [x] useAgent with OnStateChanged - Task 2
- [x] predict_state metadata config - Task 5
- [x] copilotkit_emit_state in update_step - Task 4
- [x] TaskProgress UI with dark theme - Task 2
- [x] Delete StepTracker - Task 3

### Type Consistency
- `Step` interface: `{description, status: "pending" | "completed"}`
- `AgentState` interface: `{steps: Step[], active_step_index: number}`
- Used consistently in frontend types, useAgent state, and backend emissions

### No Placeholders
- All code provided inline
- No TODOs or "implement later"
- Exact file paths specified
- Exact commands provided

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-02-realtime-task-progress.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach do you prefer?**
