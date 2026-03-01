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
  profile_data: any;
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

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Upcoming Meetings</h2>
        <div className="text-sm text-text-muted font-medium">
          Showing {clients.length} scheduled client{clients.length !== 1 ? 's' : ''}
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong p-16 text-center text-text-muted bg-surface/50 backdrop-blur-sm">
          <Calendar className="w-12 h-12 mx-auto text-text-faint mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No upcoming meetings</h3>
          <p className="max-w-md mx-auto">You don&apos;t have any client meetings scheduled or the database is unreachable.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
