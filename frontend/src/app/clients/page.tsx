import { Calendar } from "lucide-react";
import { ClientCard } from "./ClientCard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

async function getClients() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("meeting_date", { ascending: true })
    .order("meeting_time", { ascending: true });

  if (error) {
    console.error("Error fetching clients:", error.message);
    return [];
  }
  return data as Client[];
}

async function getLatestCalls(clientIds: string[]): Promise<Record<string, CallInfo>> {
  if (clientIds.length === 0) return {};
  const supabase = await createClient();
  
  // Fetch the most recent call for each client
  const { data, error } = await supabase
    .from("calls")
    .select("id, client_id, status")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false });

  if (error || !data) return {};

  // Keep only the latest call per client
  const callMap: Record<string, CallInfo> = {};
  for (const call of data) {
    if (!callMap[call.client_id]) {
      callMap[call.client_id] = { id: call.id, status: call.status };
    }
  }
  return callMap;
}

export default async function ClientsPage() {
  const clients = await getClients();
  const callMap = await getLatestCalls(clients.map(c => c.id));

  // Group clients by meeting_date
  const groupedClients: Record<string, Client[]> = {};
  clients.forEach(client => {
    if (!groupedClients[client.meeting_date]) {
      groupedClients[client.meeting_date] = [];
    }
    groupedClients[client.meeting_date].push(client);
  });

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) return "Today";
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow";

    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const sortedDates = Object.keys(groupedClients).sort();
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-text-primary">Upcoming Meetings</h2>
        <p className="text-sm text-text-muted font-medium">
          You have {clients.length} scheduled client{clients.length !== 1 ? 's' : ''} this week
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong p-20 text-center bg-surface/30 backdrop-blur-xl shadow-inner">
          <Calendar className="w-16 h-16 mx-auto text-text-faint mb-6 opacity-30" />
          <h3 className="text-xl font-bold text-text-primary mb-2">Clear Schedule</h3>
          <p className="max-w-xs mx-auto text-text-muted text-sm leading-relaxed">
            No upcoming meetings found. New bookings will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {sortedDates.map((date) => (
            <section key={date} className="relative">
              {/* Sticky Date Header */}
              <div className="sticky top-20 z-20 py-3 mb-4 -mx-4 px-4 bg-background/80 backdrop-blur-md flex items-center justify-between border-b border-border-subtle/50">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-brand-primary-light">
                  {formatDateHeader(date)}
                </h3>
                <span className="text-[10px] font-bold text-text-faint tracking-widest uppercase">
                  {groupedClients[date].length} {groupedClients[date].length === 1 ? 'Meeting' : 'Meetings'}
                </span>
              </div>

              {/* List of Client Cards */}
              <div className="space-y-4">
                {groupedClients[date].map((client) => (
                  <ClientCard 
                    key={client.id} 
                    client={client} 
                    latestCall={callMap[client.id] || null}
                    isToday={client.meeting_date === todayStr}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
