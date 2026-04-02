"use client";

import { useSyncExternalStore, useState, useCallback, type ReactNode } from "react";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { ThreadProvider } from "./ThreadContext";

const subscribe = () => () => {}; // no-op subscription
const getSnapshot = () => true; // always true on client
const getServerSnapshot = () => false; // always false on server

export function Providers({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);

  const handleNewThread = useCallback(() => {
    // Setting a new UUID forces CopilotKit to start a fresh conversation
    setThreadId(crypto.randomUUID());
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="research_assistant" threadId={threadId}>
      <ThreadProvider onNewThread={handleNewThread}>{children}</ThreadProvider>
    </CopilotKit>
  );
}
