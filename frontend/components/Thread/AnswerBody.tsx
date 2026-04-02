"use client";

import React from "react";
import Markdown from "react-markdown";
import { FileText } from "lucide-react";

interface AnswerBodyProps {
  content: string;
  onFileClick?: (filePath: string) => void;
}

/**
 * Regex matching a file path like /some/path/file.ext
 * Captures paths starting with / that contain at least one filename with an extension.
 */
const FILE_PATH_REGEX = /(\/(?:[\w.-]+\/)*[\w.-]+\.[\w]+)/g;

/**
 * Takes a plain string and replaces file-path substrings with clickable chips.
 * Returns an array of React nodes (strings + elements).
 */
function renderWithFileLinks(
  text: string,
  onFileClick?: (path: string) => void,
): React.ReactNode[] {
  if (!onFileClick) return [text];

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(FILE_PATH_REGEX)) {
    const filePath = match[0];
    const idx = match.index!;

    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx));
    }

    const filename = filePath.split("/").pop() || filePath;
    parts.push(
      <button
        key={`file-${idx}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFileClick(filePath);
        }}
        className="
          inline-flex items-center gap-1.5 px-2.5 py-1 mx-0.5
          bg-blue-600/15 hover:bg-blue-600/25
          border border-blue-500/30 hover:border-blue-400/50
          rounded-lg text-[13px] font-medium text-blue-300 hover:text-blue-200
          transition-all duration-200 cursor-pointer
          group
        "
        title={`Xem báo cáo: ${filePath}`}
      >
        <FileText size={13} className="shrink-0 text-blue-400 group-hover:text-blue-300" />
        <span className="underline underline-offset-2 decoration-blue-500/40 group-hover:decoration-blue-400/60">
          {filename}
        </span>
      </button>,
    );
    lastIndex = idx + filePath.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function AnswerBody({ content, onFileClick }: AnswerBodyProps) {
  if (!content) return null;

  return (
    <div className="text-[15px] text-gray-100 leading-relaxed">
      <Markdown
        components={{
          a: ({ href, children, ...props }) => {
            if (!href || /^javascript\s*:/i.test(href)) return <span>{children}</span>;
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5ba4cf] underline underline-offset-2 hover:text-[#7bb8dd] transition-colors"
                {...props}
              >
                {children}
              </a>
            );
          },
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-white" {...props}>
              {children}
            </strong>
          ),
          code: ({ children, className, ...props }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code
                  className={`${className} block bg-[#2a2a2a] text-[#e06c75] px-4 py-3 rounded-lg text-[13px] font-mono overflow-x-auto my-3`}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // For inline code, check if it's a file path and make it clickable
            const text = typeof children === "string" ? children : "";
            if (onFileClick && FILE_PATH_REGEX.test(text)) {
              FILE_PATH_REGEX.lastIndex = 0; // reset regex state
              return <>{renderWithFileLinks(text, onFileClick)}</>;
            }

            return (
              <code
                className="bg-[#2a2a2a] text-[#e06c75] px-1.5 py-0.5 rounded text-[13px] font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          h2: ({ children, ...props }) => (
            <h2 className="text-white font-semibold text-[17px] mt-6 mb-2" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-white font-semibold text-[15px] mt-4 mb-1.5" {...props}>
              {children}
            </h3>
          ),
          ul: ({ children, ...props }) => (
            <ul className="list-disc pl-5 space-y-3 text-[15px] text-gray-200 my-3" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-5 space-y-3 text-[15px] text-gray-200 my-3" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-relaxed" {...props}>
              {children}
            </li>
          ),
          p: ({ children, ...props }) => {
            // For paragraph text, detect file paths and make them clickable
            if (onFileClick && typeof children === "string" && FILE_PATH_REGEX.test(children)) {
              FILE_PATH_REGEX.lastIndex = 0;
              return (
                <p className="my-3 leading-relaxed" {...props}>
                  {renderWithFileLinks(children, onFileClick)}
                </p>
              );
            }

            // Handle mixed children (text + inline elements)
            if (onFileClick && Array.isArray(children)) {
              const processed = children.map((child, idx) => {
                if (typeof child === "string" && FILE_PATH_REGEX.test(child)) {
                  FILE_PATH_REGEX.lastIndex = 0;
                  return <React.Fragment key={idx}>{renderWithFileLinks(child, onFileClick)}</React.Fragment>;
                }
                return child;
              });
              return (
                <p className="my-3 leading-relaxed" {...props}>
                  {processed}
                </p>
              );
            }

            return (
              <p className="my-3 leading-relaxed" {...props}>
                {children}
              </p>
            );
          },
          em: ({ children, ...props }) => (
            <em className="italic text-[#5ba4cf] underline" {...props}>
              {children}
            </em>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-2 border-white/20 pl-4 my-3 text-gray-300 italic"
              {...props}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
