"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ThreadContextValue {
  /** Resets the conversation by generating a new thread ID */
  startNewThread: () => void;
  /** Monotonically increasing counter — components can react to changes */
  threadVersion: number;
}

const ThreadContext = createContext<ThreadContextValue>({
  startNewThread: () => {},
  threadVersion: 0,
});

export function useThread() {
  return useContext(ThreadContext);
}

export function ThreadProvider({
  children,
  onNewThread,
}: {
  children: ReactNode;
  onNewThread: () => void;
}) {
  const [threadVersion, setThreadVersion] = useState(0);

  const startNewThread = useCallback(() => {
    onNewThread();
    setThreadVersion((v) => v + 1);
  }, [onNewThread]);

  return (
    <ThreadContext value={{ startNewThread, threadVersion }}>
      {children}
    </ThreadContext>
  );
}
