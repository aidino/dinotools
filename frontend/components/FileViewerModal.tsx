"use client";

import { useEffect, useCallback } from "react";
import { X, Download, FileText } from "lucide-react";
import type { ResearchFile } from "@/types/research";
import { AnswerBody } from "@/components/Thread/AnswerBody";

interface FileViewerModalProps {
  file: ResearchFile | null;
  onClose: () => void;
}

export function FileViewerModal({ file, onClose }: FileViewerModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (file) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [file, handleKeyDown]);

  if (!file) return null;

  const filename = file.path.split("/").pop() || file.path;

  const handleDownload = () => {
    const blob = new Blob([file.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative max-w-3xl w-full max-h-[85vh] flex flex-col bg-[#232323] rounded-2xl border border-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-viewer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h2
              id="file-viewer-title"
              className="text-xl font-bold truncate max-w-md text-white"
            >
              {filename}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              aria-label="Download file"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnswerBody content={file.content} />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10">
          <code className="font-mono text-sm text-gray-500">{file.path}</code>
        </div>
      </div>
    </div>
  );
}
