"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ResearchRecord {
  id: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  summary_text?: string;
  company_data?: Record<string, unknown>;
  news_data?: Record<string, unknown>;
  competitor_data?: Record<string, unknown>;
  linkedin_data?: Record<string, unknown>;
  raw_research?: Record<string, unknown>;
}

interface StreamEvent {
  event: string;
  agent?: string;
  status?: string;
  message?: string;
  report?: { report: string };
  [key: string]: unknown;
}

interface ResearchModalProps {
  clientId: string;
  clientName: string;
  companyName: string;
  initialResearch?: ResearchRecord;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  discovery: "Company Discovery",
  website: "Website Crawler",
  news: "News Intelligence",
  financial: "Financial Intelligence",
  people: "People & Decision Makers",
  tech: "Technology Stack",
  competitive: "Competitive Landscape",
  summarizer: "Sales Brief Generator",
};

const AGENT_EMOJI: Record<string, string> = {
  discovery: "🔍",
  website: "🌐",
  news: "📰",
  financial: "💰",
  people: "👥",
  tech: "🛠",
  competitive: "⚔️",
  summarizer: "✨",
};

function SectionToggle({ title, data }: { title: string; data: Record<string, unknown> | unknown[] | null | undefined }) {
  const [open, setOpen] = useState(false);
  if (!data || (typeof data === "object" && Object.keys(data).length === 0))
    return null;
  return (
    <div className="rounded-xl border border-border-subtle overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-surface-elevated hover:bg-surface transition-colors"
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-border-subtle bg-surface/30 px-4 py-3 max-h-72 overflow-y-auto">
          <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ResearchModal({
  clientId,
  clientName,
  companyName,
  initialResearch,
  onClose,
}: ResearchModalProps) {
  // If already completed with summary, show it straight away
  const alreadyDone =
    initialResearch?.status === "completed" && !!initialResearch.summary_text;

  const [phase, setPhase] = useState<"loading" | "streaming" | "done">(
    alreadyDone ? "done" : "streaming"
  );
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [research, setResearch] = useState<ResearchRecord | null>(
    alreadyDone ? initialResearch ?? null : null
  );
  const [agentStatuses, setAgentStatuses] = useState<
    Record<string, "started" | "completed" | "failed" | "skipped">
  >({});

  const logRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  // Auto-scroll the event log
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [events]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Start SSE stream if not already done
  useEffect(() => {
    if (alreadyDone) return;

    const es = new EventSource(
      `http://localhost:8000/api/research/${clientId}/stream`
    );
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const ev: StreamEvent = JSON.parse(e.data);

        if (ev.event === "done") {
          es.close();
          return;
        }

        setEvents((prev) => [...prev, ev]);

        // Track per-agent status for the sidebar
        if (ev.event === "status" && ev.agent) {
          setAgentStatuses((prev) => ({
            ...prev,
            [ev.agent!]: ev.status,
          }));
        }

        // When the backend has saved to DB, fetch full record
        if (ev.event === "saved") {
          fetch(`http://localhost:8000/api/research/${clientId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((r) => {
              if (r && r.status === "completed") {
                setResearch(r);
                setPhase("done");
              }
            });
        }

        // Fallback: final_report event carries the report inline
        if (ev.event === "final_report" && ev.report?.report) {
          setResearch({
            id: "",
            status: "completed",
            summary_text: ev.report.report,
          });
          setPhase("done");
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
      // Try fetching from DB on error — may already be completed
      fetch(`http://localhost:8000/api/research/${clientId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((r) => {
          if (r && r.status === "completed" && r.summary_text) {
            setResearch(r);
            setPhase("done");
          }
        });
    };

    return () => {
      es.close();
    };
  }, [clientId, alreadyDone]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-border-strong bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand-primary-light" />
            </div>
            <div>
              <h2 className="font-bold text-foreground leading-tight">
                {companyName}
              </h2>
              <p className="text-xs text-text-muted">{clientName} · Sales Brief</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {phase === "streaming" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Researching…
              </span>
            )}
            {phase === "done" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
                <CheckCircle2 className="w-3 h-3" />
                Complete
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left — Agent progress sidebar */}
          <div className="w-56 shrink-0 border-r border-border-subtle bg-surface/30 flex flex-col p-4 gap-1 overflow-y-auto">
            <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-2">
              Agents
            </p>
            {Object.entries(AGENT_LABELS).map(([key, label]) => {
              const s = agentStatuses[key];
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors ${
                    s === "completed"
                      ? "bg-green-500/10 text-green-400"
                      : s === "failed"
                      ? "bg-red-500/10 text-red-400"
                      : s === "skipped"
                      ? "bg-surface text-text-faint"
                      : s === "started"
                      ? "bg-amber-500/10 text-amber-400"
                      : "text-text-faint"
                  }`}
                >
                  <span className="text-base leading-none">
                    {AGENT_EMOJI[key]}
                  </span>
                  <span className="leading-tight">{label}</span>
                  <span className="ml-auto shrink-0">
                    {s === "completed" && (
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    )}
                    {s === "failed" && (
                      <AlertCircle className="w-3 h-3 text-red-400" />
                    )}
                    {s === "started" && (
                      <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right — Main content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {phase === "streaming" && (
              /* Live event log */
              <div
                ref={logRef}
                className="flex-1 overflow-y-auto p-5 space-y-1.5 font-mono text-xs"
              >
                {events.length === 0 && (
                  <div className="flex items-center gap-2 text-text-faint">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Starting research pipeline…
                  </div>
                )}
                {events.map((ev, i) => {
                  if (ev.event === "heartbeat") {
                    return (
                      <div key={i} className="text-text-faint flex items-center gap-2">
                        <span className="opacity-40">···</span>
                        {ev.message}
                      </div>
                    );
                  }
                  if (ev.event === "started") {
                    return (
                      <div key={i} className="text-brand-primary-light font-semibold">
                        ▶ {ev.message}
                      </div>
                    );
                  }
                  if (ev.event === "status") {
                    const color =
                      ev.status === "completed"
                        ? "text-green-400"
                        : ev.status === "failed"
                        ? "text-red-400"
                        : ev.status === "skipped"
                        ? "text-text-faint"
                        : "text-amber-400";
                    const icon =
                      ev.status === "completed"
                        ? "✓"
                        : ev.status === "failed"
                        ? "✗"
                        : ev.status === "skipped"
                        ? "–"
                        : "⟳";
                    return (
                      <div key={i} className={`flex items-start gap-2 ${color}`}>
                        <span className="shrink-0 w-3">{icon}</span>
                        <span>
                          <span className="font-semibold">
                            [{AGENT_LABELS[ev.agent ?? ""] ?? ev.agent}]
                          </span>{" "}
                          {ev.message}
                        </span>
                      </div>
                    );
                  }
                  if (ev.event === "error") {
                    return (
                      <div key={i} className="text-red-400">
                        ✗ Error: {ev.message}
                      </div>
                    );
                  }
                  if (ev.event === "saved") {
                    return (
                      <div key={i} className="text-brand-primary-light font-semibold">
                        💾 Saved to database
                      </div>
                    );
                  }
                  return null;
                })}
                <div className="flex items-center gap-2 text-text-faint">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Agents working…</span>
                </div>
              </div>
            )}

            {phase === "done" && research && (
              <div className="flex-1 overflow-y-auto">
                {/* Summary */}
                <div className="p-6 border-b border-border-subtle">
                  <div className="prose prose-sm prose-invert max-w-none text-text-secondary leading-relaxed
                    [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mb-3 [&_h1]:mt-5 [&_h1:first-child]:mt-0
                    [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-2 [&_h2]:mt-5
                    [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-text-secondary [&_h3]:mb-1.5 [&_h3]:mt-4
                    [&_p]:mb-3 [&_p:last-child]:mb-0
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1
                    [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1
                    [&_li]:text-text-secondary
                    [&_strong]:text-foreground [&_strong]:font-semibold
                    [&_em]:text-text-muted
                    [&_hr]:border-border-subtle [&_hr]:my-4
                    [&_blockquote]:border-l-2 [&_blockquote]:border-brand-primary/50 [&_blockquote]:pl-4 [&_blockquote]:text-text-muted [&_blockquote]:italic
                    [&_code]:bg-surface-elevated [&_code]:text-brand-primary-light [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                    [&_pre]:bg-surface-elevated [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:mb-3
                    [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse
                    [&_th]:text-left [&_th]:text-text-faint [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:py-1.5 [&_th]:px-2 [&_th]:border-b [&_th]:border-border-subtle
                    [&_td]:py-1.5 [&_td]:px-2 [&_td]:border-b [&_td]:border-border-subtle/50
                    [&_a]:text-brand-primary-light [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {research.summary_text ?? ""}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Raw data sections */}
                {(research.company_data ||
                  research.news_data ||
                  research.competitor_data ||
                  research.linkedin_data ||
                  research.raw_research?.financial ||
                  research.raw_research?.tech) && (
                  <div className="p-6 space-y-3">
                    <p className="text-xs font-semibold text-text-faint uppercase tracking-wider">
                      Raw Intelligence Data
                    </p>
                    <SectionToggle
                      title="🌐 Company & Website"
                      data={research.company_data}
                    />
                    <SectionToggle
                      title="📰 News & Events"
                      data={research.news_data}
                    />
                    <SectionToggle
                      title="⚔️ Competitive Landscape"
                      data={research.competitor_data}
                    />
                    <SectionToggle
                      title="👥 People & Decision Makers"
                      data={research.linkedin_data}
                    />
                    <SectionToggle
                      title="💰 Financial Intelligence"
                      data={research.raw_research?.financial}
                    />
                    <SectionToggle
                      title="🛠 Technology Stack"
                      data={research.raw_research?.tech}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
