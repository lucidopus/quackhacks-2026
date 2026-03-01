"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface FollowUp {
  action: string;
  assigned_to: string;
  role: string;
  priority: "high" | "medium" | "low";
  due: string;
  context: string;
}

interface Coaching {
  area: string;
  observation: string;
  recommendation: string;
  example_script?: string;
}

interface TranscriptSegment {
  speaker: string;
  text: string;
  created_at: string;
}

interface Insights {
  id: string;
  call_id: string;
  summary: string;
  action_items: FollowUp[];       // follow_ups stored in action_items column
  improvement_suggestions: Coaching[]; // coaching stored here
  task_assignments: string[];      // key_topics stored here
  status: "processing" | "completed" | "failed";
  created_at: string;
  // Call metadata
  call_started_at?: string;
  call_ended_at?: string;
  transcript_segments?: number;
  transcript_segments_data?: TranscriptSegment[];
  client_name?: string;
  client_company?: string;
  client_role?: string;
}

interface InsightsPageProps {
  params: Promise<{ id: string }>;
}

export default function InsightsPage({ params }: InsightsPageProps) {
  use(params);
  const searchParams = useSearchParams();
  const callId = searchParams.get("callId") || "";

  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Poll for insights
  useEffect(() => {
    if (!callId) return;

    const fetchInsights = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/calls/${callId}/insights`);
        if (res.ok) {
          const data = await res.json();
          setInsights(data);
          setLoading(false);
          if (data.status === "completed" || data.status === "failed") {
            clearInterval(id);
          }
        }
      } catch {
        setError("Failed to fetch insights");
        setLoading(false);
      }
    };

    fetchInsights();
    const id = setInterval(fetchInsights, 3000);
    return () => clearInterval(id);
  }, [callId]);

  const formatTime = (iso: string | undefined) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
    });
  };

  const getDuration = () => {
    if (!insights?.call_started_at || !insights?.call_ended_at) return "—";
    const ms = new Date(insights.call_ended_at).getTime() - new Date(insights.call_started_at).getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };


  const followUps = insights?.action_items || [];
  const coaching = insights?.improvement_suggestions || [];
  const keyTopics = insights?.task_assignments || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 grid-background pointer-events-none" />

      <main className="relative z-10 max-w-[1600px] mx-auto px-6 py-10">
        <div className="lg:grid lg:grid-cols-4 lg:gap-10">
          {/* Left Column: Insights & Actions (3/4 width) */}
          <div className="lg:col-span-3 space-y-8">
            {/* Page Title & Status (Integrated into Main) */}
            {!loading && insights?.status === "completed" && (
              <div className="flex items-end justify-between border-b border-border-subtle pb-6 mb-2">
                <div className="flex items-center gap-4">
                  <Link href="/clients" className="text-text-muted hover:text-text-primary transition-colors pb-1">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                  </Link>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-primary">Post-Call Insights</h1>
                    <p className="text-text-muted mt-1 font-medium">
                      {insights?.client_name} · {insights.client_company}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="bg-status-success/15 text-status-success-light px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                    {insights?.status}
                  </span>
                  <p className="text-[10px] text-text-faint uppercase tracking-widest font-bold">Analysis Complete</p>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-14 h-14 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
                <p className="text-text-muted text-sm font-medium">Analyzing transcript & generating follow-ups...</p>
                <p className="text-text-faint text-xs">Usually takes 5-10 seconds</p>
              </div>
            )}

            {/* Error */}
            {error && <div className="text-center py-20 text-status-danger-light">{error}</div>}

            {insights?.status === "completed" && (
              <>
                {/* ─── Call Metadata Bar ─── */}
                <div className="flex flex-wrap items-center gap-4 px-5 py-3.5 rounded-xl bg-surface-elevated/40 border border-border-subtle text-xs text-text-muted shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-text-secondary">{getDuration()}</span>
                    <span>duration</span>
                  </div>
                  <div className="w-px h-3.5 bg-border-subtle" />
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                    <span className="font-medium text-text-secondary">{insights.transcript_segments || 0}</span>
                    <span>segments analyzed</span>
                  </div>
                  <div className="w-px h-3.5 bg-border-subtle" />
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span>{formatTime(insights.call_started_at)}</span>
                    <span>→</span>
                    <span>{formatTime(insights.call_ended_at)}</span>
                  </div>
                </div>

                {/* ─── Key Topics Pills ─── */}
                {(keyTopics as string[]).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-text-faint font-bold uppercase tracking-[0.2em] mr-1">Topics</span>
                    {(keyTopics as string[]).map((topic, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-elevated text-text-secondary border border-border-subtle shadow-sm">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}

                {/* ─── Summary ─── */}
                <section className="rounded-2xl border border-border-subtle bg-surface/50 backdrop-blur-sm p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-brand-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold">Executive Summary</h2>
                  </div>
                  <p className="text-base text-text-secondary leading-relaxed font-normal">{insights.summary}</p>
                </section>

                {/* ─── FOLLOW-UPS (Hero Section - Single Subtle Style) ─── */}
                <section className="rounded-2xl border border-border-strong bg-surface/30 backdrop-blur-md p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-brand-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold tracking-tight">Follow-Up Actions</h2>
                        <p className="text-xs text-text-muted mt-0.5">Assigned to team members to ensure execution</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-text-faint font-bold uppercase tracking-widest">
                        {followUps.length} items
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(followUps as FollowUp[]).map((item, i) => {
                      return (
                        <div key={i} className="flex items-start gap-4 p-5 rounded-xl border border-border-subtle bg-surface-elevated/40 transition-all hover:bg-surface-elevated/60 hover:border-border-strong group">
                          {/* Priority Marker (Subtle Dot) */}
                          <div className="pt-1.5 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-brand-primary/40 group-hover:bg-brand-primary transition-colors" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1.5">
                              <p className="text-sm text-text-primary font-bold leading-tight">{item.action}</p>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-primary/5 text-brand-primary/60 border border-brand-primary/10">
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-xs text-text-muted leading-relaxed font-medium">{item.context}</p>
                          </div>

                          {/* Assignee + Due */}
                          <div className="shrink-0 flex flex-col items-end justify-center min-h-[44px]">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="text-right">
                                <p className="text-xs text-text-secondary font-bold leading-none">{item.assigned_to}</p>
                                <p className="text-[10px] text-text-faint font-medium">{item.role}</p>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-surface-strong flex items-center justify-center text-[10px] font-bold text-text-secondary border border-border-subtle">
                                {item.assigned_to?.split(" ").map(n => n[0]).join("") || "?"}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter bg-surface/50 px-2 py-0.5 rounded border border-border-subtle">
                              {item.due}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* ─── Coaching ─── */}
                <section className="space-y-4 pb-20">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-brand-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18L20.25 7.5M5.25 12l4.25 4.5" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold">Sales Coaching</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(coaching as Coaching[]).map((tip, i) => (
                      <div key={i} className="p-6 rounded-2xl border border-border-subtle bg-surface/40 backdrop-blur-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary-light bg-brand-primary/10 px-2 py-0.5 rounded-full">
                            {tip.area}
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] font-bold text-text-faint uppercase tracking-tighter mb-1">Observation</p>
                            <p className="text-sm text-text-primary leading-relaxed font-medium">{tip.observation}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-text-faint uppercase tracking-tighter mb-1">Recommendation</p>
                            <p className="text-sm text-brand-primary-light leading-relaxed font-semibold">{tip.recommendation}</p>
                          </div>
                          {tip.example_script && (
                            <div className="p-3 rounded-lg bg-surface-elevated/40 border border-brand-primary/5 mt-2 italic text-xs text-text-secondary">
                              &ldquo;{tip.example_script}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* Right Column: Immovable Transcript (1/4 width) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 h-[calc(100vh-120px)] flex flex-col rounded-2xl border border-border-subtle bg-surface/30 backdrop-blur-md overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-border-subtle bg-surface-elevated/50 shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary">Transcript</h2>
                  <span className="text-[10px] font-bold text-text-faint bg-surface/50 px-2 py-0.5 rounded-full border border-border-subtle">
                    {insights?.transcript_segments_data?.length || 0} segments
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4">
                {loading ? (
                  <div className="flex flex-col gap-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="space-y-2 animate-pulse">
                        <div className="w-16 h-3 bg-surface-elevated rounded" />
                        <div className="w-full h-10 bg-surface-elevated/50 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : insights?.transcript_segments_data ? (
                  insights.transcript_segments_data.map((seg, i) => (
                    <div key={i} className="space-y-1 group">
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${
                          seg.speaker === 'salesperson' ? 'text-brand-primary-light' : 'text-status-warning-light'
                        }`}>
                          {seg.speaker}
                        </span>
                        <span className="text-[8px] text-text-faint font-mono">{new Date(seg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`p-3 rounded-xl text-xs leading-relaxed border ${
                        seg.speaker === 'salesperson' 
                          ? 'bg-brand-primary/5 border-brand-primary/10 text-text-secondary' 
                          : 'bg-surface-elevated/50 border-border-subtle text-text-primary'
                      }`}>
                        {seg.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-faint italic text-center py-10">No transcript segments available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
