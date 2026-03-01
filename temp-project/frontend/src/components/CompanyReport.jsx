import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Download, RotateCcw, Copy, CheckCheck,
  Globe, Linkedin, Clock, CheckCircle2,
} from 'lucide-react'
import clsx from 'clsx'

function SourceBadge({ label, available }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border',
        available
          ? 'bg-green-500/10 border-green-500/20 text-green-400'
          : 'bg-gray-800 border-gray-700 text-gray-500',
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', available ? 'bg-green-400' : 'bg-gray-600')} />
      {label}
    </span>
  )
}

function MetaBar({ metadata, elapsed }) {
  const { website, industry, agents_succeeded = [], data_sources = {} } = metadata || {}
  const sourceMap = {
    discovery: 'Discovery',
    website: 'Website',
    news: 'News',
    financial: 'Financial',
    people: 'People',
    tech: 'Tech',
    competitive: 'Competitive',
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
      {/* Meta info row */}
      <div className="flex flex-wrap gap-4 items-center">
        {website && (
          <a href={website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors">
            <Globe size={14} />
            {website.replace(/^https?:\/\/(www\.)?/, '')}
          </a>
        )}
        {industry && (
          <span className="text-sm text-gray-400">
            <span className="text-gray-600">Industry: </span>{industry}
          </span>
        )}
        {elapsed && (
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Clock size={13} />
            {elapsed}s
          </span>
        )}
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <CheckCircle2 size={13} className="text-green-400" />
          {agents_succeeded.length}/7 agents
        </span>
      </div>

      {/* Data source badges */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(sourceMap).map(([key, label]) => (
          <SourceBadge key={key} label={label} available={!!data_sources[key]} />
        ))}
      </div>
    </div>
  )
}

export default function CompanyReport({ report, companyName, onReset }) {
  const [copied, setCopied] = useState(false)

  const { report: reportData, metadata, elapsed_seconds } = report
  const markdownReport = reportData?.report || reportData?.full_response || ''

  const handleDownload = () => {
    const blob = new Blob([markdownReport], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${companyName.replace(/\s+/g, '_')}_sales_brief.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownReport)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-100">
            {companyName} <span className="text-gray-500 font-normal text-base">— Sales Brief</span>
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Ready for your next call
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            {copied ? <CheckCheck size={14} className="text-green-400" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            <Download size={14} />
            Download
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm text-white transition-colors"
          >
            <RotateCcw size={14} />
            New Search
          </button>
        </div>
      </div>

      {/* Meta bar */}
      <MetaBar metadata={metadata} elapsed={elapsed_seconds} />

      {/* Report content */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8">
        <div className="prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdownReport}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
