import { useState } from 'react'
import { Search, Briefcase, ChevronRight, Building2, TrendingUp, Users, Shield } from 'lucide-react'

const EXAMPLE_COMPANIES = [
  'Snowflake',
  'Datadog',
  'HubSpot',
  'Notion',
  'Figma',
  'Stripe',
  'Confluent',
  'Palantir',
]

const FEATURE_CARDS = [
  { icon: Building2, label: 'Company Overview', desc: 'Website, products, pricing, value prop' },
  { icon: TrendingUp, label: 'Financial Health', desc: 'Revenue, funding, growth trajectory' },
  { icon: Users, label: 'Decision Makers', desc: 'Executives & buying committee' },
  { icon: Shield, label: 'Competitive Intel', desc: 'Competitors & market positioning' },
]

export default function CompanySearch({ onResearch }) {
  const [companyName, setCompanyName] = useState('')
  const [sellerContext, setSellerContext] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!companyName.trim() || loading) return
    setLoading(true)
    await onResearch({ companyName: companyName.trim(), sellerContext })
    setLoading(false)
  }

  const handleExample = (name) => {
    setCompanyName(name)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pt-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          6 AI agents · Real-time research
        </div>
        <h1 className="text-4xl font-bold text-gray-100 tracking-tight">
          Know your prospect <span className="text-brand-400">before the call</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Enter a company name and get a comprehensive sales brief — financials,
          decision makers, tech stack, competitive landscape, and tailored talking points.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Company name, e.g. Salesforce, Snowflake, Stripe…"
            className="w-full bg-gray-900 border border-gray-700 focus:border-brand-500 rounded-2xl pl-12 pr-4 py-4 text-gray-100 placeholder-gray-500 outline-none transition-colors text-lg"
            autoFocus
          />
        </div>

        {/* Seller context */}
        <div className="relative">
          <Briefcase size={16} className="absolute left-4 top-3.5 text-gray-500" />
          <input
            type="text"
            value={sellerContext}
            onChange={(e) => setSellerContext(e.target.value)}
            placeholder="Optional: What are you selling? e.g. 'We sell cloud security tools'"
            className="w-full bg-gray-900 border border-gray-800 focus:border-gray-600 rounded-xl pl-11 pr-4 py-3 text-gray-300 placeholder-gray-600 outline-none transition-colors text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={!companyName.trim() || loading}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-4 rounded-2xl transition-all duration-200 text-lg"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Starting research…
            </>
          ) : (
            <>
              <Search size={20} />
              Research Company
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Example companies */}
      <div>
        <p className="text-xs text-gray-600 mb-3 text-center">Try an example</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {EXAMPLE_COMPANIES.map((name) => (
            <button
              key={name}
              onClick={() => handleExample(name)}
              className="text-sm px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-full text-gray-400 hover:text-gray-200 transition-all"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-3 pt-4">
        {FEATURE_CARDS.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3">
            <div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-300">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
