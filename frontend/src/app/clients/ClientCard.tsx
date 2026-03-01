"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Building2, Briefcase, Video, Beaker, Loader2, CheckCircle2, FlaskConical } from "lucide-react";
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
  initialResearch,
}: {
  client: Client;
  initialResearch?: ResearchRecord;
}) {
  const router = useRouter();
  const [researchStatus, setResearchStatus] = useState<string>(
    initialResearch?.status ?? "not_started"
  );
  const [modalOpen, setModalOpen] = useState(false);

  const formatMeetingTime = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(`${dateStr}T${timeStr}`);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return `${dateStr} ${timeStr}`;
    }
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const today = isToday(client.meeting_date);

  const handleResearchClick = () => {
    if (researchStatus === "not_started" || researchStatus === "failed") {
      setResearchStatus("in_progress");
    }
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    fetch(`http://localhost:8000/api/research/${client.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => { if (r?.status) setResearchStatus(r.status); })
      .catch(() => {});
  };

  const handleJoinMeet = async () => {
    try {
      // 1. Create a call record
      const res = await fetch("http://localhost:8000/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.id }),
      });
      const data = await res.json();
      const callId = data.call_id;

      // 2. Open Meet link in new tab (env var takes priority)
      const meetLink =
        process.env.NEXT_PUBLIC_GOOGLE_MEET_LINK ||
        client.meeting_link ||
        "";
      if (meetLink) {
        window.open(meetLink, "_blank");
      }

      // 3. Navigate to the live call page
      router.push(`/clients/${client.id}/call?callId=${callId}`);
    } catch (err) {
      console.error("Failed to create call:", err);
    }
  };

  return (
    <>
    <div 
      className={`group flex flex-col rounded-2xl border bg-surface/50 backdrop-blur-sm card-hover transition-all ${
        today 
          ? 'border-brand-primary/50 shadow-md shadow-brand-primary/10' 
          : 'border-border-subtle hover:border-border-strong shadow-sm'
      }`}
    >
      {/* Header — time + status */}
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
        <div className={`flex items-center gap-2 text-sm font-medium ${today ? 'text-brand-primary-light' : 'text-text-secondary'}`}>
          <Clock className="w-4 h-4" />
          {formatMeetingTime(client.meeting_date, client.meeting_time)}
        </div>
        {researchStatus === "completed" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400 border border-green-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Researched
          </span>
        ) : researchStatus === "in_progress" || researchStatus === "pending" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
            <Loader2 className="w-3 h-3 animate-spin" />
            Researching
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium text-text-faint border border-border-subtle">
            Not Started
          </span>
        )}
      </div>

      {/* Body — name, company, role */}
      <div className="p-6 flex-1 flex flex-col gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-brand-primary-light transition-colors duration-300">
            {client.name}
          </h3>
          <div className="flex flex-col gap-2 text-text-muted text-sm mt-3">
            {client.company && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 shrink-0" />
                <span>{client.company}</span>
              </div>
            )}
            {client.role && (
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 shrink-0" />
                <span>{client.role}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 pt-0 mt-auto grid grid-cols-2 gap-3">
        <button
          onClick={handleResearchClick}
          className="flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-border-strong bg-surface-elevated text-text-secondary hover:text-foreground hover:border-text-faint transition-colors cursor-pointer"
        >
          {researchStatus === "completed" ? (
            <FlaskConical className="w-4 h-4 text-green-400" />
          ) : researchStatus === "in_progress" || researchStatus === "pending" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Beaker className="w-4 h-4" />
          )}
          {researchStatus === "completed"
            ? "View Brief"
            : researchStatus === "in_progress" || researchStatus === "pending"
            ? "View Progress"
            : "Research"}
        </button>
        <button 
          onClick={handleJoinMeet}
          className="flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-transparent bg-gradient-to-r from-brand-primary to-brand-accent-dark text-white hover:shadow-lg hover:shadow-brand-primary/25 active:scale-[0.97] transition-all duration-200 cursor-pointer"
        >
          <Video className="w-4 h-4" />
          Join Meet
        </button>
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

