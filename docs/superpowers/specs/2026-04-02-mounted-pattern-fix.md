# Fix React setState-in-Effect Warning

**Date:** 2026-04-02  
**Status:** Approved  
**Topic:** mounted-state-pattern-fix

---

## Problem Statement

The `page.tsx` component uses a common pattern to avoid hydration mismatches between server and client rendering:

```typescript
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);  // ⚠️ Triggers React warning
}, []);
```

This pattern triggers React's warning: *"Calling setState synchronously within an effect can trigger cascading renders. Effects are intended to synchronize state between React and external systems..."*

## Solution

Replace the `useState` + `useEffect` pattern with `useSyncExternalStore` — React's purpose-built hook for synchronizing with external systems.

### Implementation

```typescript
import { useSyncExternalStore } from "react";

// Simple store for detecting client-side environment
const subscribe = () => () => {}; // no-op subscription
const getSnapshot = () => true;   // always true on client
const getServerSnapshot = () => false; // always false on server

// Usage in component
const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
```

### How It Works

1. **Server render**: Returns `false` from `getServerSnapshot` → shows placeholder UI
2. **Client hydration**: Returns `true` from `getSnapshot` → renders full UI
3. **No effect needed**: Value is computed synchronously, no `setState` calls

### Benefits

- Eliminates React warning about cascading renders
- Follows React best practices for external store synchronization
- Works correctly with Next.js App Router SSR/hydration
- Cleaner, more idiomatic code

---

## Self-Review Checklist

- [x] No TBD/TODO items
- [x] Internally consistent
- [x] Scope is focused (single pattern fix)
- [x] No ambiguous requirements

## Implementation

See the generated implementation plan for detailed steps.
