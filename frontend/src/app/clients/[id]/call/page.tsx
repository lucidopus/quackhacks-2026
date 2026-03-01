"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAudioPipeline } from "@/hooks/useAudioPipeline";
import { LiveTranscript } from "@/components/LiveTranscript";
import { SuggestionCard } from "@/components/SuggestionCard";
import { use } from "react";

interface CallPageProps {
  params: Promise<{ id: string }>;
}

export default function CallPage({ params }: CallPageProps) {
  const { id: clientId } = use(params);
  const searchParams = useSearchParams();
  const callId = searchParams.get("callId") || "";

  const [callStatus, setCallStatus] = useState<
    "pending" | "listening" | "active" | "ended"
  >("pending");
  const [duration, setDuration] = useState(0);
  const [clientInfo, setClientInfo] = useState<{
    name: string;
    company: string;
    role: string;
  } | null>(null);
  
  const { 
    isCapturing, 
    error: captureError, 
    suggestions, 
    transcripts,
    startPipeline, 
    stopPipeline, 
    clearSuggestions 
  } = useAudioPipeline(callId, clientId);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch client info
  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(
          `http://localhost:8000/api/clients/${clientId}`
        );
        if (res.ok) {
          const data = await res.json();
          setClientInfo(data);
        }
      } catch {
        // silently handle
      }
    }
    fetchClient();
  }, [clientId]);

  // Duration timer
  useEffect(() => {
    if (callStatus === "active") {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // Derive effective call status — avoids setState inside effect
  const effectiveCallStatus = isCapturing && callStatus === "listening" ? "active" : callStatus;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleStartListening = useCallback(async () => {
    setCallStatus("listening");
    await startPipeline();
  }, [startPipeline]);

  const handleEndCall = useCallback(async () => {
    stopPipeline();
    setCallStatus("ended");

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await fetch(`http://localhost:8000/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
    } catch (err) {
      console.error("Failed to update call status:", err);
    }
  }, [callId, stopPipeline]);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div className="fixed inset-0 grid-background pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col max-w-7xl mx-auto w-full px-6 pt-10 pb-6 min-h-0 overflow-hidden">
        {/* Simplified Header for Call Page */}
        <div className="flex items-end justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/clients" className="text-text-muted hover:text-text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {clientInfo ? `Call with ${clientInfo.name}` : "Live Call"}
              </h1>
              <p className="text-sm text-text-muted font-medium">
                {clientInfo ? `${clientInfo.company} · ${clientInfo.role}` : "Initialing system..."}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated/50 border border-border-subtle">
              {effectiveCallStatus === "active" ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-status-danger-light animate-pulse" />
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Live Recording</span>
                  <div className="w-px h-3 bg-border-subtle mx-1" />
                  <span className="text-xs font-mono font-bold text-text-primary">
                    {formatDuration(duration)}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-text-faint" />
                  <span className="text-[10px] font-bold text-text-faint uppercase tracking-widest">
                    Ended · {formatDuration(duration)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0 overflow-hidden">
          {/* Transcript Panel */}
          <div className="lg:col-span-3 rounded-2xl border border-border-subtle bg-surface/50 backdrop-blur-sm flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle bg-surface-elevated/50 shrink-0">
              <div className="text-[10px] font-semibold text-text-faint uppercase tracking-[0.15em]">
                Live Transcript
              </div>
            </div>
            <LiveTranscript callId={callId} segments={transcripts} />
          </div>

          {/* AI Suggestions Panel (Phase 5) */}
          <div className="lg:col-span-2 rounded-2xl border border-border-subtle bg-surface/50 backdrop-blur-sm flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle bg-surface-elevated/50 shrink-0 flex items-center justify-between">
              <div className="text-[10px] font-semibold text-text-faint uppercase tracking-[0.15em]">
                AI Suggestions
              </div>
              {suggestions.length > 0 && (
                <button 
                  onClick={clearSuggestions}
                  className="text-[10px] text-brand-primary hover:text-brand-accent transition-colors font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {suggestions.length === 0 ? (
                <div className="h-full flex items-center justify-center p-6 grayscale opacity-50">
                  <div className="text-center text-text-faint">
                    <svg className="w-10 h-10 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <p className="text-sm">Suggestions will appear here during the call</p>
                  </div>
                </div>
              ) : (
                suggestions.map((suggestion, idx) => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} isLatest={idx === 0} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="mt-6 flex items-center justify-center gap-4 shrink-0">
          {captureError && (
            <div className="text-sm text-status-danger-light bg-status-danger/10 border border-status-danger/20 rounded-xl px-4 py-2">
              {captureError}
            </div>
          )}

          {effectiveCallStatus === "pending" && (
            <button
              onClick={handleStartListening}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent-dark font-semibold text-white hover:shadow-xl hover:shadow-brand-primary/25 active:scale-[0.97] transition-all duration-200 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              Start Listening
            </button>
          )}

          {effectiveCallStatus === "listening" && (
            <div className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted font-medium">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="15" />
              </svg>
              Connecting...
            </div>
          )}

          {effectiveCallStatus === "active" && (
            <button
              onClick={handleEndCall}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-status-danger font-semibold text-white hover:bg-status-danger-light active:scale-[0.97] transition-all duration-200 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
              </svg>
              End Call
            </button>
          )}

          {effectiveCallStatus === "ended" && (
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-elevated border border-border-subtle text-text-muted font-medium">
                <svg className="w-5 h-5 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Call Ended
              </div>
              <a
                href={`/clients/${clientId}/insights?callId=${callId}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent-dark font-semibold text-white hover:shadow-xl hover:shadow-brand-primary/25 active:scale-[0.97] transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                </svg>
                Show Call Insights
              </a>
              <a
                href="/clients"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border-strong text-text-secondary font-medium hover:text-text-primary hover:bg-surface-elevated transition-all"
              >
                Back to Dashboard
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
