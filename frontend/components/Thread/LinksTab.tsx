"use client";

import { ExternalLink } from "lucide-react";
import type { Source } from "@/types/research";

interface LinksTabProps {
  sources: Source[];
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.slice(0, 20);
  }
}

export function LinksTab({ sources }: LinksTabProps) {
  if (sources.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">No sources collected yet.</p>
        <p className="text-gray-600 text-xs mt-1">Sources will appear here as the agent researches.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-gray-400 mb-3">{sources.length} sources</p>
      {sources.map((source, i) => (
        <a
          key={`${source.url}-${i}`}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors duration-150 group"
        >
          <span className="text-xs text-gray-500 mt-0.5 shrink-0 w-5 text-right">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-200 group-hover:text-white truncate">
              {source.title || getDomain(source.url)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{getDomain(source.url)}</p>
          </div>
          <ExternalLink size={12} className="text-gray-600 group-hover:text-gray-400 mt-1 shrink-0 transition-colors" />
        </a>
      ))}
    </div>
  );
}
