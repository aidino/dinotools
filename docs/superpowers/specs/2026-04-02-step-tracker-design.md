# Step Tracker Design

**Date**: 2026-04-02
**Status**: Draft

## Summary

Display a structured research plan with live progress tracking in the chat UI. The user sees their research steps update in real-time (pending -> running -> done) as the agent works, instead of the current black-box experience.

## Problem

The `research()` tool runs as a blocking call in a `ThreadPoolExecutor`. The frontend only sees "in progress" then "complete" with no intermediate feedback. The user has no visibility into which research step is executing or how far along the process is.

## Solution

Use CopilotKit's `copilotkit_emit_state()` to push step progress from the Python backend to the React frontend via the AG-UI protocol. Add a persistent StepTracker panel above the chat that reads `agent.state` reactively.

## Architecture

### Data Flow

```
Agent calls write_todos
  -> Backend emits state: { steps: [...], active_step_index: -1 }
  -> AG-UI StateSnapshot event
  -> agent.state.steps updates on frontend
  -> StepTracker renders all steps as "pending"

Agent calls update_step(N, "running")
  -> Backend emits state: { active_step_index: N, steps[N].status: "running" }
  -> StepTracker highlights step N as "running"

Agent calls research(query)
  -> research tool executes in ThreadPoolExecutor
  -> on return, agent calls update_step(N, "done")

Agent calls write_file
  -> Final report written
  -> All steps resolved
```

### State Schema

Pushed to frontend via `copilotkit_emit_state`:

```python
{
    "steps": [
        {"id": 0, "content": "Research AI trends", "status": "pending"},
        {"id": 1, "content": "Analyze market data", "status": "pending"},
    ],
    "active_step_index": -1  # -1 = none active
}
```

Step statuses: `"pending"`, `"running"`, `"done"`.

## Backend Changes

### 1. New tool: `update_step`

A lightweight tool the agent calls before/after each `research()` call to mark step progress.

The backend maintains a `_step_progress` dict keyed by thread ID (extracted from `config`) to track the current steps and their statuses. This avoids reading from LangGraph state (which may not be available inside a tool) and keeps the progress tracking independent.

```python
import asyncio
from copilotkit.langgraph import copilotkit_emit_state
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

# Module-level progress tracker: thread_id -> { steps: [...], active_step_index: int }
_step_progress: dict[str, dict] = {}

def _get_thread_id(config: RunnableConfig) -> str:
    return config.get("configurable", {}).get("thread_id", "default")

@tool
async def update_step(step_index: int, status: str, config: RunnableConfig):
    """Update the status of the current research step. Call before starting and after completing each research step.

    Args:
        step_index: The zero-based index of the step in the research plan.
        status: "running" or "done".
    """
    thread_id = _get_thread_id(config)
    progress = _step_progress.get(thread_id, {"steps": [], "active_step_index": -1})

    if 0 <= step_index < len(progress["steps"]):
        progress["steps"][step_index]["status"] = status
        progress["active_step_index"] = step_index if status == "running" else -1
        _step_progress[thread_id] = progress

        await copilotkit_emit_state(config, {
            "steps": progress["steps"],
            "active_step_index": progress["active_step_index"],
        })
    return f"Step {step_index} marked as {status}"
```

When `write_todos` completes, the backend also updates `_step_progress` with the full step list before emitting.

The tool is **not** added to `emit_tool_calls` — it is hidden from the frontend chat. The user sees progress only via the StepTracker UI.

### 2. Modify `write_todos` handling

When `write_todos` completes, emit the full step list to state:

```python
# After write_todos tool completes, populate _step_progress and emit:
thread_id = _get_thread_id(config)
steps = [
    {"id": i, "content": todo["content"], "status": "pending"}
    for i, todo in enumerate(todos)
]
_step_progress[thread_id] = {"steps": steps, "active_step_index": -1}

await copilotkit_emit_state(config, {
    "steps": steps,
    "active_step_index": -1,
})
```

This hook into `write_todos` completion can be implemented by:
- Adding a custom LangGraph node after the tool execution node, OR
- Wrapping the tool result in a middleware callback

### 3. Agent prompt update

Update the system prompt in `agents/deep_research.py` to instruct the agent to call `update_step` before and after each `research()` call:

```
Before researching each step, call update_step(step_index, "running").
After completing the research for a step, call update_step(step_index, "done").
Use the zero-based index matching the position in your todo list.
```

### 4. Thread isolation

The `research()` tool runs in a `ThreadPoolExecutor`. The `update_step` calls happen **outside** the thread — the agent calls `update_step` before invoking `research()` and after it returns. No changes to the thread isolation mechanism are needed.

## Frontend Changes

### 1. New component: `StepTracker`

Location: `frontend/components/StepTracker.tsx`

Props:
- `steps: Step[]` — array of steps with id, content, status
- `activeIndex: number` — currently running step (-1 = none)

Visual design:
- Horizontal list of steps, each row shows:
  - **Pending**: Gray circle + gray text
  - **Running**: Blue pulsing circle + bold blue text
  - **Done**: Green checkmark + dimmed text
- Collapsible toggle to show/hide
- Only visible when `steps.length > 0`
- Positioned as a persistent panel above the chat messages

### 2. Type definition

Add to `frontend/types/research.ts`:

```typescript
interface Step {
  id: number;
  content: string;
  status: "pending" | "running" | "done";
}
```

### 3. Integration in `page.tsx`

```typescript
const { agent } = useAgent({ agentId: "research_assistant" });

const steps = (agent.state?.steps as Step[] | undefined) ?? [];
const activeIndex = (agent.state?.active_step_index as number | undefined) ?? -1;

// Render StepTracker above the message list
<StepTracker steps={steps} activeIndex={activeIndex} />
```

### 4. Cleanup on new conversation

When the user sends a new message, steps reset automatically — the backend re-emits from scratch for each research session.

### 5. Agent completion fallback

When `agent.isRunning` becomes false and steps remain in "running" status, auto-mark them as "done" on the frontend.

## Files to Modify

| File | Change |
|------|--------|
| `agents/deep_research.py` | Add `update_step` tool, update system prompt, emit steps on write_todos |
| `agents/tools.py` | Potentially refactor to separate step emission from research execution |
| `agents/main.py` | Register `update_step` tool (if not auto-registered by deepagents) |
| `frontend/components/StepTracker.tsx` | New component |
| `frontend/types/research.ts` | Add `Step` type |
| `frontend/app/page.tsx` | Read `agent.state` for steps, render StepTracker |

## Out of Scope

- Sub-step granularity (queries within a research call, source-by-source progress)
- Error state display (red indicators for failed steps)
- Images tab or source content preview
- Sidebar integration
