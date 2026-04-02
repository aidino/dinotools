"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { ThreadProvider } from "./ThreadContext";

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
  }, []);

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
