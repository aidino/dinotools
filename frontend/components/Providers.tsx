"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CopilotKit } from "@copilotkit/react-core/v2";

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="research_assistant">{children}</CopilotKit>
  );
}
