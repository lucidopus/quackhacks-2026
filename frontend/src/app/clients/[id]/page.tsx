"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Briefcase,
  Mail,
  Phone,
  Video,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  meeting_date: string;
  meeting_time: string;
  meeting_link: string;
  profile_data: Record<string, unknown>;
}

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

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === "failed") return <AlertCircle className="w-4 h-4 text-red-400" />;
  return <Loader2 className="w-4 h-4 animate-spin text-amber-400" />;
}

function SectionCard({
  title,
  data,
}: {
  title: string;
  data: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface/50 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-elevated transition-colors"
      >
        <span className="font-semibold text-sm text-foreground">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        )}
      </button>
      {open && (
        <div className="border-t border-border-subtle px-5 py-4">
          <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono overflow-x-auto leading-relaxed">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: clientId } = use(params);

  const [client, setClient] = useState<Client | null>(null);
  const [research, setResearch] = useState<ResearchRecord | null>(null);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Fetch client + research on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [clientRes, researchRes] = await Promise.all([
          fetch(`http://localhost:8000/api/clients/${clientId}`),
          fetch(`http://localhost:8000/api/research/${clientId}`),
        ]);
        if (clientRes.ok) setClient(await clientRes.json());
        if (researchRes.ok) {
          const r = await researchRes.json();
          if (r.status !== "not_started") setResearch(r);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clientId]);

  // Auto-scroll stream log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamEvents]);

  const startResearch = () => {
    if (isStreaming) return;
    setIsStreaming(true);
    setStreamEvents([]);

    const es = new EventSource(
      `http://localhost:8000/api/research/${clientId}/stream`
    );
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const event: StreamEvent = JSON.parse(e.data);
        if (event.event === "done") {
          es.close();
          setIsStreaming(false);
          // Reload research results
          fetch(`http://localhost:8000/api/research/${clientId}`)
            .then((r) => r.ok ? r.json() : null)
            .then((r) => r && setResearch(r));
          return;
        }
        setStreamEvents((prev) => [...prev, event]);
        if (event.event === "saved") {
          // Reload after save
          fetch(`http://localhost:8000/api/research/${clientId}`)
            .then((r) => r.ok ? r.json() : null)
            .then((r) => r && setResearch(r));
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
      setIsStreaming(false);
    };
  };

  const formatDate = (d: string, t: string) => {
    try {
      return new Date(`${d}T${t}`).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return `${d} ${t}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary-light" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-16 text-text-muted">Client not found.</div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to clients
      </button>

      {/* Client header */}
      <div className="rounded-2xl border border-border-subtle bg-surface/50 backdrop-blur-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
          <div className="flex flex-col gap-1.5 mt-2 text-sm text-text-muted">
            {client.company && (
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4" /> {client.company}
              </span>
            )}
            {client.role && (
              <span className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> {client.role}
              </span>
            )}
            {client.email && (
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> {client.email}
              </span>
            )}
            {client.phone && (
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> {client.phone}
              </span>
            )}
          </div>
          {client.meeting_date && (
            <p className="text-xs text-text-faint mt-3">
              Meeting: {formatDate(client.meeting_date, client.meeting_time)}
            </p>
          )}
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() =>
              router.push(
                `/clients/${client.id}/call`
              )
            }
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent-dark text-white hover:shadow-lg transition-all"
          >
            <Video className="w-4 h-4" />
            Join Meet
          </button>
        </div>
      </div>

      {/* Research section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-primary-light" />
            Company Research
          </h2>
          {research?.status !== "completed" && !isStreaming && (
            <button
              onClick={startResearch}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-border-strong bg-surface-elevated text-text-secondary hover:text-foreground hover:border-text-faint transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {research ? "Re-run Research" : "Start Research"}
            </button>
          )}
        </div>

        {/* Stream log */}
        {(isStreaming || streamEvents.length > 0) && (
          <div className="rounded-xl border border-border-subtle bg-surface/30 p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-1.5">
            {streamEvents.map((ev, i) => {
              if (ev.event === "heartbeat") {
                return (
                  <div key={i} className="text-text-faint">
                    ⏳ {ev.message}
                  </div>
                );
              }
              if (ev.event === "status") {
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 ${
                      ev.status === "completed"
                        ? "text-green-400"
                        : ev.status === "failed"
                        ? "text-red-400"
                        : "text-amber-400"
                    }`}
                  >
                    <StatusIcon status={ev.status ?? ""} />
                    <span>
                      [{ev.agent}] {ev.message}
                    </span>
                  </div>
                );
              }
              if (ev.event === "started" || ev.event === "saved") {
                return (
                  <div key={i} className="text-brand-primary-light">
                    ✓ {ev.message}
                  </div>
                );
              }
              if (ev.event === "error") {
                return (
                  <div key={i} className="text-red-400">
                    ✗ {ev.message}
                  </div>
                );
              }
              return null;
            })}
            {isStreaming && (
              <div className="flex items-center gap-2 text-text-faint">
                <Loader2 className="w-3 h-3 animate-spin" />
                Running…
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        )}

        {/* Summary */}
        {research?.status === "completed" && research.summary_text && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">
                Research Complete
              </span>
            </div>
            <div className="prose prose-sm prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-text-secondary leading-relaxed">
                {research.summary_text}
              </pre>
            </div>
          </div>
        )}

        {research?.status === "in_progress" && !isStreaming && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            <span className="text-sm text-amber-300">
              Research is in progress in the background…
            </span>
          </div>
        )}

        {/* Expandable data sections */}
        {research?.status === "completed" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
              Raw Intelligence Data
            </h3>
            <SectionCard
              title="🌐 Company & Website"
              data={research.company_data}
            />
            <SectionCard
              title="📰 News & Events"
              data={research.news_data}
            />
            <SectionCard
              title="⚔️ Competitive Landscape"
              data={research.competitor_data}
            />
            <SectionCard
              title="👥 People & Decision Makers"
              data={research.linkedin_data}
            />
            {research.raw_research?.financial && (
              <SectionCard
                title="💰 Financial Intelligence"
                data={research.raw_research.financial}
              />
            )}
            {research.raw_research?.tech && (
              <SectionCard
                title="🛠 Technology Stack"
                data={research.raw_research.tech}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
