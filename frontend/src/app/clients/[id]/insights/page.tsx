"use client";

import { useEffect, useState, use } from "react";
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

  const priorityConfig = {
    high: { bg: "bg-status-danger/12", text: "text-status-danger-light", border: "border-status-danger/20", dot: "bg-status-danger-light" },
    medium: { bg: "bg-status-warning/12", text: "text-status-warning-light", border: "border-status-warning/20", dot: "bg-status-warning-light" },
    low: { bg: "bg-status-success/12", text: "text-status-success-light", border: "border-status-success/20", dot: "bg-status-success-light" },
  };

  const followUps = insights?.action_items || [];
  const coaching = insights?.improvement_suggestions || [];
  const keyTopics = insights?.task_assignments || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 grid-background pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border-subtle bg-background/70 backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/clients" className="text-text-muted hover:text-text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </a>
            <div>
              <h1 className="text-lg font-semibold">Post-Call Insights</h1>
              <p className="text-sm text-text-muted">
                {insights?.client_name
                  ? `${insights.client_name} · ${insights.client_company}`
                  : "Loading..."}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            insights?.status === "completed"
              ? "bg-status-success/15 text-status-success-light"
              : insights?.status === "failed"
                ? "bg-status-danger/15 text-status-danger-light"
                : "bg-brand-primary/15 text-brand-primary-light animate-pulse"
          }`}>
            {insights?.status || "analyzing"}
          </span>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
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
            <div className="flex flex-wrap items-center gap-4 px-5 py-3.5 rounded-xl bg-surface-elevated/60 border border-border-subtle text-xs text-text-muted">
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
                <span className="text-xs text-text-faint font-medium uppercase tracking-wider mr-1">Topics</span>
                {(keyTopics as string[]).map((topic, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary-light border border-brand-primary/15">
                    {topic}
                  </span>
                ))}
              </div>
            )}

            {/* ─── Summary ─── */}
            <section className="rounded-2xl border border-border-subtle bg-surface/50 backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/12 flex items-center justify-center">
                  <svg className="w-4 h-4 text-brand-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold">Summary</h2>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{insights.summary}</p>
            </section>

            {/* ─── FOLLOW-UPS (Hero Section) ─── */}
            <section className="rounded-2xl border-2 border-brand-primary/25 bg-gradient-to-b from-brand-primary/[0.04] to-transparent backdrop-blur-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-primary/15 flex items-center justify-center">
                    <svg className="w-5 h-5 text-brand-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Follow-Up Actions</h2>
                    <p className="text-xs text-text-faint">Assigned to your team — never miss a follow-up</p>
                  </div>
                </div>
                <span className="text-xs text-text-faint px-2.5 py-1 bg-surface-elevated rounded-full font-medium">
                  {followUps.length} actions
                </span>
              </div>

              <div className="space-y-3">
                {(followUps as FollowUp[]).map((item, i) => {
                  const p = priorityConfig[item.priority] || priorityConfig.medium;
                  return (
                    <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border ${p.border} ${p.bg} transition-all hover:shadow-sm`}>
                      {/* Priority dot */}
                      <div className="pt-1 shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary font-semibold leading-snug">{item.action}</p>
                        <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{item.context}</p>
                      </div>

                      {/* Assignee + Due */}
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-[9px] font-bold text-white">
                            {item.assigned_to?.split(" ").map(n => n[0]).join("") || "?"}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-text-secondary font-medium leading-none">{item.assigned_to}</p>
                            <p className="text-[10px] text-text-faint">{item.role}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${p.bg} ${p.text}`}>
                          {item.due}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ─── Coaching ─── */}
            {(coaching as Coaching[]).length > 0 && (
              <section className="rounded-2xl border border-border-subtle bg-surface/50 backdrop-blur-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-brand-accent/12 flex items-center justify-center">
                    <svg className="w-4 h-4 text-brand-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                    </svg>
                  </div>
                  <h2 className="text-base font-bold">Sales Coaching</h2>
                </div>
                <div className="space-y-4">
                  {(coaching as Coaching[]).map((item, i) => (
                    <div key={i} className="p-4 rounded-xl border border-brand-accent/10 bg-brand-accent/[0.03]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-accent/12 text-brand-accent-light">
                          {item.area}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mb-1"><strong className="text-text-secondary">Observed:</strong> {item.observation}</p>
                      <p className="text-sm text-text-secondary leading-relaxed">{item.recommendation}</p>
                      {item.example_script && (
                        <div className="mt-2.5 pl-3 border-l-2 border-brand-accent/20 bg-brand-accent/[0.02] rounded-r-lg py-2 pr-3">
                          <p className="text-xs text-text-faint italic">&ldquo;{item.example_script}&rdquo;</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Back */}
            <div className="flex justify-center pt-2 pb-8">
              <a
                href="/clients"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border-strong text-text-secondary font-medium hover:text-text-primary hover:bg-surface-elevated transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to Dashboard
              </a>
            </div>
          </>
        )}

        {/* Failed */}
        {insights?.status === "failed" && (
          <div className="text-center py-20">
            <p className="text-status-danger-light text-lg font-medium mb-2">Analysis Failed</p>
            <p className="text-text-faint text-sm">{insights.summary}</p>
          </div>
        )}
      </main>
    </div>
  );
}
