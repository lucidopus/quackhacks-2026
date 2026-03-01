import clsx from 'clsx'
import {
  Globe, Newspaper, DollarSign, Users, Cpu, Sword,
  Search, CheckCircle2, XCircle, Loader2, AlertTriangle, SkipForward,
} from 'lucide-react'

const AGENT_META = {
  discovery:    { label: 'Company Discovery',        icon: Search,      color: 'text-purple-400',  bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  website:      { label: 'Website Crawler',          icon: Globe,       color: 'text-blue-400',    bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  news:         { label: 'News Intelligence',        icon: Newspaper,   color: 'text-yellow-400',  bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  financial:    { label: 'Financial Intelligence',   icon: DollarSign,  color: 'text-green-400',   bg: 'bg-green-500/10',  border: 'border-green-500/20'  },
  people:       { label: 'People Intelligence',      icon: Users,       color: 'text-pink-400',    bg: 'bg-pink-500/10',   border: 'border-pink-500/20'   },
  tech:         { label: 'Tech Intelligence',        icon: Cpu,         color: 'text-cyan-400',    bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20'   },
  competitive:  { label: 'Competitive Analysis',     icon: Sword,       color: 'text-orange-400',  bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  summarizer:   { label: 'Sales Brief Builder',      icon: CheckCircle2,color: 'text-brand-400',   bg: 'bg-brand-500/10',  border: 'border-brand-500/20'  },
  orchestrator: { label: 'Orchestrator',             icon: Loader2,     color: 'text-gray-400',    bg: 'bg-gray-500/10',   border: 'border-gray-500/20'   },
}

function StatusIcon({ status }) {
  switch (status) {
    case 'completed': return <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
    case 'failed':    return <XCircle size={14} className="text-red-400 flex-shrink-0" />
    case 'skipped':   return <SkipForward size={14} className="text-gray-500 flex-shrink-0" />
    case 'partial':   return <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
    default:          return <Loader2 size={14} className="text-brand-400 animate-spin flex-shrink-0" />
  }
}

function DataPills({ data }) {
  if (!data) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {Object.entries(data).map(([k, v]) => (
        <span key={k} className="text-xs bg-gray-800 text-gray-400 rounded-full px-2 py-0.5">
          {k.replace(/_/g, ' ')}: <span className="text-gray-300">{String(v)}</span>
        </span>
      ))}
    </div>
  )
}

function AgentCard({ agentKey, events, compact }) {
  const meta = AGENT_META[agentKey] || AGENT_META.orchestrator
  const Icon = meta.icon

  // Get the latest event for this agent
  const agentEvents = events.filter((e) => e.agent === agentKey)
  if (agentEvents.length === 0) return null

  const latest = agentEvents[agentEvents.length - 1]
  const isActive = latest.status === 'started' || latest.status === 'parsing'

  if (compact && latest.status === 'skipped') return null

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-3 rounded-xl border transition-all',
        meta.bg, meta.border,
        isActive && 'ring-1 ring-inset ring-brand-500/30',
      )}
    >
      <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', meta.bg)}>
        <Icon size={14} className={meta.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={clsx('text-xs font-semibold', meta.color)}>{meta.label}</span>
          <StatusIcon status={latest.status} />
        </div>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{latest.message}</p>
        {!compact && <DataPills data={latest.data} />}
      </div>
    </div>
  )
}

export default function AgentTimeline({ events, compact = false }) {
  if (!events || events.length === 0) return null

  // Get the error events
  const errorEvents = events.filter((e) => e.event === 'error')

  // Get unique agent keys in order of first appearance
  const seenAgents = []
  const seenKeys = new Set()
  for (const e of events) {
    if (e.agent && !seenKeys.has(e.agent)) {
      seenKeys.add(e.agent)
      seenAgents.push(e.agent)
    }
  }

  return (
    <div className="space-y-2">
      {!compact && (
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">
          Agent Pipeline
        </h3>
      )}
      <div className={clsx('grid gap-2', compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2')}>
        {seenAgents.map((key) => (
          <AgentCard key={key} agentKey={key} events={events} compact={compact} />
        ))}
      </div>
      {errorEvents.map((e, i) => (
        <div key={i} className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{e.message}</p>
        </div>
      ))}
    </div>
  )
}
