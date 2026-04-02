"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

interface ThreadContextValue {
  /** Resets the conversation by generating a new thread ID */
  startNewThread: () => void;
  /** Monotonically increasing counter — components can react to changes */
  threadVersion: number;
  /** Register a callback to be called before starting a new thread (for state cleanup) */
  registerResetCallback: (callback: () => void) => () => void;
}

const ThreadContext = createContext<ThreadContextValue>({
  startNewThread: () => {},
  threadVersion: 0,
  registerResetCallback: () => () => {},
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
  const resetCallbacksRef = useRef<Set<() => void>>(new Set());

  const registerResetCallback = useCallback((callback: () => void) => {
    resetCallbacksRef.current.add(callback);
    return () => {
      resetCallbacksRef.current.delete(callback);
    };
  }, []);

  const startNewThread = useCallback(() => {
    // Call all registered reset callbacks before starting new thread
    resetCallbacksRef.current.forEach((cb) => cb());
    onNewThread();
    setThreadVersion((v) => v + 1);
  }, [onNewThread]);

  return (
    <ThreadContext value={{ startNewThread, threadVersion, registerResetCallback }}>
      {children}
    </ThreadContext>
  );
}
