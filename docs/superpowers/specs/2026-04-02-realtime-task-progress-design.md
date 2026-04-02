# Design Doc: Real-time Task Progress Update

**Date**: 2026-04-02  
**Topic**: Real-time Task Progress Streaming from Backend to Frontend  
**Status**: Approved

## 1. Overview

Replace the current task progress mechanism with a real-time state streaming approach using CopilotKit v2's `useAgent` with `OnStateChanged` updates. This enables true real-time progress visualization where backend step status changes are immediately reflected in the UI without waiting for tool call lifecycle completion.

## 2. Goals

1. Real-time step status updates from backend to frontend
2. Smooth progress visualization with animations
3. Consistent dark theme matching existing codebase
4. Remove reliance on `useDefaultRenderTool` for step tracking

## 3. Current State Analysis

### Frontend (Current)
- Uses `useDefaultRenderTool` to intercept tool call lifecycle
- Step updates only happen when tool calls start/complete
- No real-time state streaming from backend
- `StepTracker` component with basic UI

### Backend (Current)
- Has `update_step` tool but doesn't emit state to frontend
- No `predict_state` metadata configuration
- No manual state emission during step execution
- State changes only visible after tool completes

## 4. Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  page.tsx                                               │  │
│  │  ├── useAgent({ agentId, updates: [OnStateChanged] })   │  │
│  │  │     ↑ Receives real-time state from backend           │  │
│  │  │     ↓                                               │  │
│  │  ├── TaskProgress (integrated in CopilotChat)          │  │
│  │  │     Dark theme UI with progress bar                 │  │
│  │  │                                                      │  │
│  │  └── CopilotChat with messageView children             │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↑↓ AG-UI Protocol (WebSocket)
┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  deep_research.py                                       │  │
│  │  ├── predict_state metadata config                      │  │
│  │  │     (Auto-stream tool arguments)                   │  │
│  │  │                                                      │  │
│  │  └── adispatch_custom_event() in step loop             │  │
│  │        (Manual state emission during execution)         │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Data Flow

1. **Step 1 - Create Plan**: Agent calls `write_todos` → `predict_state` auto-streams `todos` argument to frontend → TaskProgress displays steps with "pending" status

2. **Step 2 - Start Step N**: Agent calls `update_step(N, "running")` → `predict_state` streams `step_index` → TaskProgress highlights step N with spinner animation

3. **Step 3 - Complete Step**: Backend runs research, then emits via `adispatch_custom_event` → TaskProgress updates step N to "completed" with green checkmark

4. **Step 4 - Loop**: Repeat steps 2-3 until all steps complete

## 6. State Shape

```typescript
// types/research.ts - Updated
export interface Step {
  description: string;
  status: "pending" | "completed";
}

export interface AgentState {
  steps: Step[];
  active_step_index: number;  // -1 means no active step
}
```

## 7. Frontend Implementation

### File: frontend/app/page.tsx

**Changes Required**:

1. **Import Updates**:
   ```tsx
   import { useAgent, UseAgentUpdate } from "@copilotkit/react-core/v2";
   ```

2. **Replace useDefaultRenderTool tracking with useAgent**:
   ```tsx
   const { agent } = useAgent({
     agentId: "research_assistant",
     updates: [UseAgentUpdate.OnStateChanged],
   });
   
   const agentState = agent.state as AgentState | undefined;
   const steps = agentState?.steps || [];
   const activeIndex = agentState?.active_step_index ?? -1;
   ```

3. **TaskProgress Component** (inline in file):
   - Dark theme colors matching codebase (#232323, blue-400, green-400)
   - Progress bar with smooth transitions
   - Step icons: Check (completed), Spinner (active), Circle (pending)
   - Pulse animation for active step
   - Integrated into CopilotChat via `messageView.children`

4. **Remove**:
   - `localSteps` state (no longer needed)
   - `update_step` handling in `useDefaultRenderTool`
   - `StepTracker` component reference

## 8. Backend Implementation

### File: agents/deep_research.py

**Changes Required**:

1. **Add config with predict_state metadata**:
   ```python
   from copilotkit.langgraph import copilotkit_configure
   
   agent_graph = create_deep_agent(...)
   
   # Configure state streaming
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
   
   return agent_graph.with_config(config)
   ```

2. **Node implementation with manual state emission**:
   ```python
   from langchain_core.callbacks.manager import adispatch_custom_event
   
   async def execute_steps_node(state: AgentState, config: RunnableConfig):
       steps = state.get("steps", [])
       
       for i, step in enumerate(steps):
           # Mark as running
           await adispatch_custom_event(
               "manually_emit_state",
               {
                   "steps": steps,
                   "active_step_index": i,
               },
               config=config,
           )
           
           # Execute research for this step
           result = await run_research(step["description"])
           
           # Mark as completed
           steps[i]["status"] = "completed"
           await adispatch_custom_event(
               "manually_emit_state",
               {
                   "steps": steps,
                   "active_step_index": -1,
               },
               config=config,
           )
   ```

### File: agents/tools.py

**Update update_step tool**:

```python
from copilotkit.langgraph import copilotkit_emit_state

@tool
async def update_step(step_index: int, status: str, config: RunnableConfig) -> str:
    """Update step status and emit to frontend."""
    thread_id = _get_thread_id(config)
    progress = _step_progress.get(thread_id, {"steps": [], "active_step_index": -1})
    steps = progress["steps"]
    
    if 0 <= step_index < len(steps):
        # Convert "running"/"done" to "pending"/"completed" for UI
        ui_status = "completed" if status == "done" else "pending"
        steps[step_index]["status"] = ui_status
        
        active_index = step_index if status == "running" else -1
        progress["active_step_index"] = active_index
        _step_progress[thread_id] = progress
        
        # Emit state to frontend
        await copilotkit_emit_state(config, {
            "steps": steps,
            "active_step_index": active_index,
        })
    
    return f"Step {step_index} marked as {status}"
```

## 9. Color Theme Mapping

| UI Element | Example Code | This Codebase |
|------------|---------------|---------------|
| Card background | `bg-gradient-to-br from-slate-900` | `bg-[#232323]` |
| Header text | `text-blue-600` | `text-blue-400` |
| Progress bar | `from-blue-500 to-purple-500` | `bg-blue-500` |
| Completed step icon | `from-green-500 to-emerald-600` | `text-green-400` |
| Running step icon | `from-blue-500 to-purple-600` | `text-blue-400` |
| Pending step icon | `bg-slate-700` | `text-gray-500` |
| Borders | `border-slate-700/50` | `border-white/10` |
| Text primary | `text-white` | `text-white` |
| Text secondary | `text-slate-400` | `text-gray-400` |

## 10. Animation Requirements

- **Progress bar**: `transition-all duration-1000 ease-out`
- **Step transitions**: `transition-all duration-500`
- **Active step pulse**: `animate-pulse`
- **Spinner icon**: `animate-spin`
- **Expand/collapse**: `transition-transform duration-200`

## 11. Files to Modify

### Frontend
1. `frontend/app/page.tsx` - Major rewrite with useAgent + TaskProgress
2. `frontend/types/research.ts` - Add Step and AgentState interfaces
3. `frontend/components/Thread/StepTracker.tsx` - Delete (replaced)

### Backend
1. `agents/deep_research.py` - Add predict_state config and state emission
2. `agents/tools.py` - Update update_step to emit state

## 12. Testing Strategy

1. Start backend server
2. Open frontend and start a research query
3. Verify:
   - Steps appear immediately when `write_todos` is called
   - Active step gets spinner animation when `update_step(index, "running")` is called
   - Step gets green checkmark when completed
   - Progress bar updates smoothly
   - All steps complete in sequence

## 13. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| State sync issues | Use both `predict_state` (for tool args) and `adispatch_custom_event` (for manual updates) |
| Performance | State updates are lightweight JSON; images/animations are CSS-based |
| Backward compatibility | Old `update_step` tool behavior preserved, just adds emission |

## 14. Success Criteria

- [ ] Steps appear in real-time when plan is created
- [ ] Each step shows "processing..." while research runs
- [ ] Step status updates to "completed" with visual feedback
- [ ] Progress bar reflects completion percentage
- [ ] All animations smooth at 60fps
- [ ] Dark theme matches existing codebase

---

**Next Step**: Implementation plan via writing-plans skill
