# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DinoTools is a Deep Research Assistant with two parts:
- **Python backend** (`agents/`): LangGraph-based AI agent using Gemini + Tavily for web research, served via FastAPI with AG-UI protocol for CopilotKit integration
- **Next.js frontend** (`frontend/`): Chat UI with a workspace panel showing research progress (todos, files, sources) using CopilotKit SDK

## Before Planning or Coding

This project depends on fast-moving libraries. **Always check latest docs before planning or implementing changes:**

- **LangChain / LangGraph**: Use Context7 (`find-docs` skill) or search langchain-docs for current API signatures, import paths, and patterns. Do not rely on training data for LangChain/LangGraph APIs.
- **CopilotKit (Python SDK + React SDK)**: Use Context7 or search CopilotKit docs for current middleware APIs, `useDefaultTool` / `useCoAgent` usage, and AG-UI protocol details. The SDK versions change frequently.
- **Next.js 16**: The frontend CLAUDE.md already warns about breaking changes — read `node_modules/next/dist/docs/` for any Next.js-specific work.
- **Deep Agents / ag-ui-langgraph**: Check package docs on PyPI/npm for current API if modifying agent graph or AG-UI integration.

## Commands

### Backend (Python 3.11, uv)

```bash
# Install dependencies
uv sync

# Run the agent server (default: 0.0.0.0:8123)
uv run python agents/main.py

# Server port is configurable via SERVER_PORT / SERVER_HOST env vars
```

### Frontend (Next.js 16, npm)

```bash
cd frontend
npm install
npm run dev      # Development server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

### Environment Variables

Backend requires in `agents/.env`:
- `GEMINI_API_KEY` — Google Gemini API key
- `TAVILY_API_KEY` — Tavily web search API key
- `GEMINI_MODEL` — optional, defaults to `gemini-3-flash-preview`

Frontend reads `LANGGRAPH_DEPLOYMENT_URL` (defaults to `http://localhost:8123`).

## Architecture

### Backend Flow

1. `agents/main.py` — FastAPI app, registers the agent at `/` via `add_langgraph_fastapi_endpoint`, CORS enabled
2. `agents/deep_research.py` — Builds the main agent graph using `create_deep_agent()` from `deepagents` package, with CopilotKitMiddleware for frontend state sync. Main tools: `research` (wraps a subagent for web search) plus built-in Deep Agents tools (`write_todos`, `read_file`, `write_file`)
3. `agents/tools.py` — `research()` tool runs an internal Deep Agent in a **separate thread** (`ThreadPoolExecutor`) to prevent LangChain callback propagation to the frontend stream. Uses `TavilyClient` for search. `internet_search` is the lower-level tool used only by the internal subagent

### Frontend Flow

1. `app/api/copilotkit/route.ts` — Next.js API route proxying to the Python backend via `LangGraphHttpAgent`
2. `app/page.tsx` — Main page: left panel = `CopilotChat`, right panel = `Workspace`. Uses `useDefaultTool` to intercept tool calls and update local state (todos, files, sources)
3. `components/ToolCard.tsx` — Generative UI rendering for tool calls in chat with specialized cards per tool type
4. `components/Workspace.tsx` — Right panel showing research plan todos, generated files, and web sources
5. `components/FileViewerModal.tsx` — Modal for viewing generated file contents
6. `types/research.ts` — Shared types for `ResearchState`, `Todo`, `ResearchFile`, `Source`

### Key Design Decisions

- **Thread isolation for research**: The `research()` tool spawns an internal agent in a `ThreadPoolExecutor` to break LangChain callback propagation. This prevents subagent tool calls from appearing as JSON noise in the frontend chat
- **CopilotKit `copilotkit_customize_config`**: Only emits specific tool calls (`research`, `write_todos`, `write_file`, `read_file`, `edit_file`) to the frontend; internal tools like `internet_search` are suppressed
- **`useDefaultTool` over `useCoAgent`**: Frontend uses local state + `useDefaultTool` pattern to avoid type mismatches with Python `FilesystemMiddleware`

### Tech Stack

- Backend: FastAPI, LangGraph, LangChain (Google GenAI / OpenAI), Deep Agents, Tavily, CopilotKit Python SDK, `ag-ui-langgraph`
- Frontend: Next.js 16 (App Router), React 19, CopilotKit React SDK, Tailwind CSS v4, lucide-react icons
- Path alias: `@/*` maps to project root in frontend
