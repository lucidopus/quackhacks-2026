"use client";

import { useEffect, useRef } from "react";
import { TranscriptSegment } from "@/hooks/useAudioPipeline";

interface LiveTranscriptProps {
  callId: string;
  segments: TranscriptSegment[];
}

export function LiveTranscript({ callId, segments }: LiveTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [segments]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="p-6 space-y-6">
        {segments.length === 0 ? (
          <div className="flex items-center justify-center min-h-[300px] text-text-faint">
            <div className="text-center">
              <div className="w-16 h-16 bg-surface-elevated/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border-subtle">
                <svg
                  className="w-8 h-8 opacity-20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium">Waiting for call activity...</p>
              <p className="text-xs mt-1 opacity-50">Click &quot;Start Listening&quot; to begin</p>
            </div>
          </div>
        ) : (
          <>
            {segments.map((seg) => (
              <div key={seg.id} className="animate-fade-in group">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                      seg.speaker === "salesperson"
                        ? "bg-brand-primary/10 text-brand-primary-light"
                        : "bg-status-success/10 text-status-success-light"
                    }`}
                  >
                    {seg.speaker === "salesperson" ? "Salesperson" : "Client"}
                  </span>
                  <span className="text-[9px] text-text-faint font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(seg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p
                  className={`text-[15px] text-text-primary leading-relaxed pl-1 border-l-2 ${
                    seg.speaker === "salesperson" ? "border-brand-primary/20" : "border-status-success/20"
                  } ${
                    !seg.is_final ? "italic opacity-60" : ""
                  }`}
                >
                  {seg.text}
                </p>
              </div>
            ))}
            <div ref={bottomRef} className="h-4" />
          </>
        )}
      </div>
    </div>
  );
}
