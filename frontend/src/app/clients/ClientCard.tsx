"use client";

import { Clock, Building2, Briefcase, Video, Beaker } from "lucide-react";

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
  profile_data: any;
}

export function ClientCard({ client }: { client: Client }) {
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

  return (
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
        <span className="inline-flex items-center rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium text-text-faint border border-border-subtle">
          Not Started
        </span>
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
          onClick={() => console.log('Research pipeline coming in Phase 2')}
          className="flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-border-strong bg-surface-elevated text-text-secondary hover:text-foreground hover:border-text-faint transition-colors cursor-pointer"
        >
          <Beaker className="w-4 h-4" />
          Research
        </button>
        <a 
          href={client.meeting_link || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-transparent bg-gradient-to-r from-brand-primary to-brand-accent-dark text-white hover:shadow-lg hover:shadow-brand-primary/25 active:scale-[0.97] transition-all duration-200"
        >
          <Video className="w-4 h-4" />
          Join Meet
        </a>
      </div>
    </div>
  );
}
