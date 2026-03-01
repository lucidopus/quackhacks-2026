"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Briefcase, Video, BarChart3, Loader2, CheckCircle2, FlaskConical, Beaker } from "lucide-react";
import { ResearchModal } from "@/components/ResearchModal";

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

interface CallInfo {
  id: string;
  status: string;
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

export function ClientCard({ 
  client, 
  latestCall, 
  isToday,
  initialResearch
}: { 
  client: Client; 
  latestCall: CallInfo | null;
  isToday: boolean;
  initialResearch?: ResearchRecord;
}) {
  const router = useRouter();
  const [researchStatus, setResearchStatus] = useState<string>(
    initialResearch?.status ?? "not_started"
  );
  const [modalOpen, setModalOpen] = useState(false);

  const isCompleted = latestCall?.status === "completed";
  const isActive = latestCall?.status === "active";

  const handleResearchClick = () => {
    if (researchStatus === "not_started" || researchStatus === "failed") {
      setResearchStatus("in_progress");
    }
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    // Refresh research status
    fetch(`http://localhost:8000/api/research/${client.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => {
        if (r?.status) setResearchStatus(r.status);
      })
      .catch(() => {});
  };

  const handleJoinMeet = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.id }),
      });
      const data = await res.json();
      const callId = data.call_id;

      // Navigate to the live call page (removed automatic window.open for Meet)
      router.push(`/clients/${client.id}/call?callId=${callId}`);
    } catch (err) {
      console.error("Failed to create call:", err);
    }
  };

  const statusDisplay = () => {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-status-success-light border border-status-success/20">
          <span className="w-1 h-1 rounded-full bg-status-success" />
          Completed
        </span>
      );
    }
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-primary-light border border-brand-primary/20 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(var(--brand-primary-rgb),0.8)]" />
          Live Now
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-faint border border-border-subtle">
        Upcoming
      </span>
    );
  };

  const researchBadge = () => {
    if (researchStatus === "completed") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-status-success-light border border-status-success/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Researched
        </span>
      );
    }
    if (researchStatus === "in_progress" || researchStatus === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-primary-light border border-brand-primary/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Researching
        </span>
      );
    }
    return null;
  };

  return (
    <>
      <div 
        className={`group relative flex items-center justify-between p-5 rounded-2xl border bg-surface/40 backdrop-blur-sm transition-all duration-300 hover:bg-surface-elevated/60 hover:shadow-xl hover:shadow-brand-primary/5 ${
          isCompleted
            ? 'border-border-subtle opacity-80 hover:opacity-100'
            : isToday 
              ? 'border-brand-primary/30 bg-brand-primary/[0.02]' 
              : 'border-border-subtle'
        }`}
      >
        <div className="flex items-center gap-6 min-w-0 flex-1">
          {/* Time Pillar */}
          <div className="flex flex-col items-center justify-center w-20 shrink-0 border-r border-border-subtle pr-6">
            <span className={`text-lg font-bold tracking-tight ${isToday ? 'text-brand-primary-light' : 'text-text-primary'}`}>
              {client.meeting_time.split(':')[0]}:{client.meeting_time.split(':')[1]}
            </span>
            <span className="text-[10px] font-bold text-text-faint uppercase tracking-tighter">
              {parseInt(client.meeting_time.split(':')[0]) >= 12 ? 'PM' : 'AM'}
            </span>
          </div>

          {/* Client Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-base font-bold text-text-primary truncate group-hover:text-brand-primary-light transition-colors">
                {client.name}
              </h3>
              {statusDisplay()}
              {researchBadge()}
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-text-muted">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-text-faint" />
                <span className="truncate">{client.company}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-text-faint" />
                <span className="truncate">{client.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Pillar */}
        <div className="flex items-center gap-3 pl-6 ml-4 border-l border-border-subtle">
          {isCompleted && latestCall ? (
            <button
              onClick={() => router.push(`/clients/${client.id}/insights?callId=${latestCall.id}`)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-status-success/10 text-status-success-light border border-status-success/20 hover:bg-status-success hover:text-white transition-all duration-200 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Call Insights
            </button>
          ) : (
            <>
              <button 
                onClick={handleResearchClick}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-border-strong bg-surface-elevated text-text-secondary hover:text-text-primary hover:border-text-faint transition-all cursor-pointer"
              >
                {researchStatus === "completed" ? (
                  <FlaskConical className="w-3.5 h-3.5 text-status-success" />
                ) : researchStatus === "in_progress" || researchStatus === "pending" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Beaker className="w-3.5 h-3.5" />
                )}
                {researchStatus === "completed"
                  ? "Briefing"
                  : researchStatus === "in_progress" || researchStatus === "pending"
                  ? "Researching"
                  : "Research"}
              </button>
              <button 
                onClick={handleJoinMeet}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-brand-primary text-white hover:shadow-lg hover:shadow-brand-primary/20 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" />
                Start Call
              </button>
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <ResearchModal
          clientId={client.id}
          clientName={client.name}
          companyName={client.company || client.name}
          initialResearch={initialResearch}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
