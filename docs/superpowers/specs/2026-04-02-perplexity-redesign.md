# Perplexity-Inspired UI Redesign

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Full frontend visual overhaul — light glassmorphic to dark Perplexity-style

## Decisions

- **Approach:** Full rewrite (Approach A) — replace page.tsx and most components entirely
- **CopilotKit:** Replace CopilotChat with custom input using useCoAgent + custom message rendering; keep useDefaultTool for inline tool cards
- **Sidebar:** All navigation items are decorative placeholders with hardcoded demo data
- **Research state:** Todos, sources, files appear inline in the Answer tab (no floating panels)
- **Tabs:** All three functional — Answer (agent response + research state), Links (collected sources), Images (placeholder)
- **Styling:** Full CSS replacement with dark theme tokens, remove all glassmorphism

## Layout

Two-column flex at full viewport height (`h-screen flex flex-row overflow-hidden`):

- **Left column:** Fixed sidebar `w-[148px]`, `bg-[#1a1a1a]`, non-scrollable, `flex flex-col`
- **Right column:** Flex-grow main `flex-1 overflow-y-auto bg-[#1a1a1a]`, centered `max-w-[700px] mx-auto px-4 py-6`

### layout.tsx

Root layout wraps children in `<Providers>` (CopilotKit context). Renders `<Sidebar />` + `<main>{children}</main>` as the two-column flex.

### page.tsx

Client component containing: SourceBanner, TabBar, AnswerBody/LinksTab/ImagesTab content area, StepsToggle, FollowUpInput. Manages local state for messages, research state (todos/files/sources), active tab, and query text.

## Sidebar Components

### Sidebar.tsx

`<aside>` with `flex flex-col gap-1 h-full px-2 py-3`:

1. **Top actions:** Search row + Computer row (icon 16px + label, `rounded-md px-3 py-2 hover:bg-white/10 text-sm text-gray-300`, Computer has active state `bg-white/10`)
2. **Navigation group** (after `mt-4`): "+ New thread" (`text-white`), then nav items: History, Discover, Spaces, Finance, Health, Academic, Patents — each with icon + label, `text-gray-400 text-sm`, "... More" at bottom
3. **History section** (after separator, label "History" in `text-xs text-gray-500`): Scrollable list of past thread titles, each truncated single-line button (`truncate text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/10 w-full text-left`)
4. **Bottom profile** (`mt-auto`): Avatar circle (24px) + "Ngo Hong Thai" (`text-sm text-gray-300`) + bell icon (`text-gray-500`)

### NavItem.tsx

Reusable row: `{ icon: LucideIcon, label: string, active?: boolean, onClick?: () => void }`. Renders icon (16px) + label with hover/active styles.

### HistoryList.tsx

Renders hardcoded demo threads (4-5 items) in a scrollable container. Each item is a clickable row with truncated title.

## Main Content Components

### SourceBanner.tsx

Centered text: "Tìm hiểu chuyên sâu về" + `<a>` hyperlink in blue underline. Displayed when a research query is active. Data from user's first message content.

### TabBar.tsx

Three tabs: Answer, Links, Images. Active tab: `border-b-2 border-white text-white`. Inactive: `border-transparent text-gray-400 hover:text-white`. Each tab has an icon + label.

### StepsToggle.tsx

Collapsible toggle: "Completed N steps" with chevron. When expanded, renders research plan todos inline — each todo shows status icon (completed/in-progress/pending) + content. Clicking toggles visibility.

### AnswerBody.tsx

Markdown renderer using `react-markdown`. Styled with dark theme prose:
- Body: `text-[15px] text-gray-100 leading-relaxed`
- Links: `text-[#5ba4cf] underline underline-offset-2`
- Bold: `font-semibold text-white`
- Inline code: `bg-[#2a2a2a] text-[#e06c75] px-1.5 py-0.5 rounded text-[13px] font-mono`
- H2: `text-white font-semibold text-[17px] mt-6 mb-2`
- UL: `list-disc pl-5 space-y-3 text-[15px] text-gray-200`
- Em/italic links: `italic text-[#5ba4cf] underline`

### FollowUpInput.tsx

Rounded input box (`rounded-2xl border border-white/10 bg-[#232323]`):
- `+` icon (PlusIcon, 18px, gray-400)
- Text input (placeholder "Ask a follow-up")
- "Deep research" pill button (`bg-white/10 hover:bg-white/20 rounded-full`)
- "GitHub" pill button (same style)
- Mic icon (18px, gray-400)
- Submit arrow button (`bg-white text-black rounded-full`)

Sends messages via CopilotKit SDK. "Deep research" pill is decorative for now.

### LinksTab.tsx

Renders collected sources as a list. Each source shows: numbered indicator, title, domain, external link icon. Uses Source type from `types/research.ts`.

## CopilotKit Integration

- `useCoAgent` for agent connection and message streaming
- `useDefaultTool` kept for intercepting tool calls (research, write_todos, write_file, read_file) and rendering ToolCard inline
- Custom message array maintained in local state — no CopilotChat component
- User messages rendered as simple text bubbles
- Assistant messages rendered via AnswerBody markdown
- Tool cards rendered inline within the message flow

## Design Tokens

```css
--bg: #1a1a1a;
--surface: #232323;
--border: rgba(255,255,255,0.1);
--text: #e5e5e5;
--muted: #9ca3af;
--link: #5ba4cf;
--code: #e06c75;
```

Font: Inter (already imported), text-[15px], leading-relaxed.

## CSS Changes (globals.css)

**Remove:**
- Entire `:root` light theme variables block
- All glassmorphism classes (`.glass`, `.glass-subtle`, `.glass-card`)
- Abstract background (`.abstract-bg`, `blob-3`, blob keyframes)
- CopilotKit sidebar/inline chat CSS overrides
- Research plan floating bar styles
- Research results floating panel styles
- Workspace panel legacy styles
- Source/file chip styles (moved to components)

**Keep (adapt):**
- `@import "tailwindcss"` and `@import "@copilotkit/react-ui/styles.css"`
- `@plugin "@tailwindcss/typography"`
- Font imports (Inter + JetBrains Mono)
- Animations: `fadeSlideIn`, `spin-slow`
- `scrollbar-hide` utility

## File Changes

| File | Action |
|------|--------|
| `app/layout.tsx` | Rewrite — sidebar + main shell |
| `app/page.tsx` | Rewrite — thread view |
| `app/globals.css` | Rewrite — dark tokens only |
| `components/Sidebar/Sidebar.tsx` | Create |
| `components/Sidebar/NavItem.tsx` | Create |
| `components/Sidebar/HistoryList.tsx` | Create |
| `components/Thread/AnswerBody.tsx` | Create |
| `components/Thread/TabBar.tsx` | Create |
| `components/Thread/StepsToggle.tsx` | Create |
| `components/Thread/FollowUpInput.tsx` | Create |
| `components/Thread/SourceBanner.tsx` | Create |
| `components/Thread/LinksTab.tsx` | Create |
| `components/ToolCard.tsx` | Restyle to dark theme |
| `components/FileViewerModal.tsx` | Restyle to dark theme |
| `components/Providers.tsx` | Keep as-is |
| `components/Workspace.tsx` | Delete |
| `components/ResearchPlan.tsx` | Delete |
| `components/ResearchResults.tsx` | Delete |
| `types/research.ts` | Keep as-is |
| `app/api/copilotkit/route.ts` | Keep as-is |

## Dependencies

No new packages needed. All required packages already installed: react-markdown, lucide-react, @copilotkit/react-core, @copilotkit/react-ui, tailwindcss, @tailwindcss/typography.
