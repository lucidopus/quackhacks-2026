"use client";

import { useRouter } from "next/navigation";
import { Clock, Building2, Briefcase, Video, Beaker, BarChart3 } from "lucide-react";

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

export function ClientCard({ client, latestCall }: { client: Client; latestCall: CallInfo | null }) {
  const router = useRouter();

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
  const isCompleted = latestCall?.status === "completed";
  const isActive = latestCall?.status === "active";

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

  const statusDisplay = () => {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center rounded-full bg-status-success/15 px-2.5 py-1 text-xs font-semibold text-status-success-light border border-status-success/20">
          ✓ Completed
        </span>
      );
    }
    if (isActive) {
      return (
        <span className="inline-flex items-center rounded-full bg-brand-primary/15 px-2.5 py-1 text-xs font-semibold text-brand-primary-light border border-brand-primary/20 animate-pulse">
          ● Live
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium text-text-faint border border-border-subtle">
        Not Started
      </span>
    );
  };

  return (
    <div 
      className={`group flex flex-col rounded-2xl border bg-surface/50 backdrop-blur-sm card-hover transition-all ${
        isCompleted
          ? 'border-status-success/30 shadow-sm'
          : today 
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
        {statusDisplay()}
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
      <div className="p-6 pt-0 mt-auto flex flex-col gap-3">
        {isCompleted && latestCall ? (
          /* Completed: show only View Call Insights */
          <button
            onClick={() => router.push(`/clients/${client.id}/insights?callId=${latestCall.id}`)}
            className="flex justify-center items-center gap-2 w-full px-4 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-status-success to-status-success-light text-white hover:shadow-lg hover:shadow-status-success/25 active:scale-[0.97] transition-all duration-200 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" />
            View Call Insights
          </button>
        ) : (
          /* Not completed: show Research + Join Meet */
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => console.log('Research pipeline coming in Phase 2')}
              className="flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-border-strong bg-surface-elevated text-text-secondary hover:text-foreground hover:border-text-faint transition-colors cursor-pointer"
            >
              <Beaker className="w-4 h-4" />
              Research
            </button>
            <button 
              onClick={handleJoinMeet}
              className="flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-transparent bg-gradient-to-r from-brand-primary to-brand-accent-dark text-white hover:shadow-lg hover:shadow-brand-primary/25 active:scale-[0.97] transition-all duration-200 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              Join Meet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
