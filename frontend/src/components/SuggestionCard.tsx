"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

export interface Suggestion {
  id: string;
  type: string;
  trigger_type: string;
  content: string;
  status: "thinking" | "done" | "error";
  timestamp: number;
  reasoning?: string;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const isThinking = suggestion.status === "thinking";

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border transition-all duration-300
      ${isThinking 
        ? "border-brand-primary/30 bg-brand-primary/5 animate-pulse" 
        : "border-border-subtle bg-surface-elevated/50 hover:border-brand-primary/50"
      }
      p-5 group
    `}>
      {/* Glow effect for new suggestions */}
      {!isThinking && (
        <div className="absolute -inset-px bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`
              px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap
              ${isThinking ? "bg-brand-primary/20 text-brand-primary" : "bg-brand-accent/20 text-brand-accent"}
            `}>
              {suggestion.trigger_type}
            </span>
            <span className="text-[10px] text-text-faint font-mono">
              {new Date(suggestion.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          
          {isThinking && (
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-brand-primary animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-1 rounded-full bg-brand-primary animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 rounded-full bg-brand-primary animate-bounce" />
            </div>
          )}
        </div>

        {isThinking ? (
          <div className="space-y-2">
            <div className="h-4 bg-text-faint/10 rounded w-3/4" />
            <div className="h-4 bg-text-faint/10 rounded w-1/2" />
          </div>
        ) : (
          <div className="text-[14px] text-text-secondary leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown components={{
              p: ({...props}) => <p className="mb-2 last:mb-0" {...props} />,
              strong: ({...props}) => <strong className="text-text-primary font-bold" {...props} />
            }}>
              {suggestion.content}
            </ReactMarkdown>
          </div>
        )}

        {suggestion.reasoning && (
          <div className="mt-3 pt-3 border-t border-border-subtle flex items-start gap-2">
             <svg className="w-3.5 h-3.5 text-text-faint shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             <p className="text-[11px] italic text-text-faint leading-normal">
               {suggestion.reasoning}
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
