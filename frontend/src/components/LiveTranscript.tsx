"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TranscriptSegment {
  id: string;
  call_id: string;
  speaker: string;
  text: string;
  is_final: boolean;
  created_at: string;
}

interface LiveTranscriptProps {
  callId: string;
}

export function LiveTranscript({ callId }: LiveTranscriptProps) {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments]);

  // Subscribe to Supabase Realtime for transcript_segments
  useEffect(() => {
    const supabase = createClient();

    // Fetch existing segments
    supabase
      .from("transcript_segments")
      .select("*")
      .eq("call_id", callId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setSegments(data as TranscriptSegment[]);
      });

    // Subscribe to new inserts
    const channel = supabase
      .channel(`transcript-${callId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transcript_segments",
          filter: `call_id=eq.${callId}`,
        },
        (payload) => {
          setSegments((prev) => [...prev, payload.new as TranscriptSegment]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto space-y-4 p-6 scroll-smooth"
    >
      {segments.length === 0 ? (
        <div className="flex items-center justify-center h-full text-text-faint">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
            <p className="text-sm">
              Click &quot;Start Listening&quot; to begin transcription
            </p>
          </div>
        </div>
      ) : (
        segments.map((seg) => (
          <div key={seg.id} className="animate-fade-in">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                seg.speaker === "salesperson"
                  ? "text-brand-primary-light"
                  : "text-status-success-light"
              }`}
            >
              {seg.speaker === "salesperson" ? "Salesperson" : "Client"}
            </span>
            <p
              className={`text-[14px] text-text-primary mt-1 leading-relaxed ${
                !seg.is_final ? "italic opacity-60" : ""
              }`}
            >
              {seg.text}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
